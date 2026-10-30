import { extractGoogleApiKey } from "../../../../lib/gemini/headers";
import { openaiChatToGoogle } from "../../../../lib/gemini/map-request";
import { googleToOpenAI } from "../../../../lib/gemini/map-response";
import { transformGoogleStreamChunk, doneMarker } from "../../../../lib/gemini/map-stream";
import { googleFetch } from "../../../../lib/gemini/client";
import { toOpenAIError, openAIError } from "../../../../lib/gemini/errors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
	try {
		const key = extractGoogleApiKey(req);
		if (!key) {
			return openAIError(401, "Missing API key. Provide Authorization: Bearer <GOOGLE_API_KEY> or x-goog-api-key.", "invalid_request_error");
		}
		
		let body: any;
		try {
			body = await req.json();
		} catch {
			return openAIError(400, "Invalid JSON body", "invalid_request_error");
		}
		
		const mapped = openaiChatToGoogle(body);
		const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
		const created = Math.floor(Date.now() / 1000);
		
		if (mapped.stream) {
			const res = await googleFetch(mapped.urlPath, {
				method: "POST",
				body: mapped.body,
				stream: true,
			}, key);
			
			if (!res.ok) {
				let errText = await res.text();
				try {
					const errJson = JSON.parse(errText);
					const oe = toOpenAIError(errJson, res.status);
					return new Response(JSON.stringify(oe.body), { status: oe.status, headers: { "content-type": "application/json" } });
				} catch {
					return openAIError(res.status, errText || "Upstream error", "api_error");
				}
			}
			
			const reader = res.body?.getReader();
			if (!reader) {
				return openAIError(500, "Failed to read stream", "api_error");
			}
			
			const decoder = new TextDecoder();
			const encoder = new TextEncoder();
			
			const stream = new ReadableStream({
				async start(controller) {
					let buffer = "";
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							buffer += decoder.decode(value, { stream: true });
							const parts = buffer.split(/\r?\n\r?\n/);
							buffer = parts.pop() || "";
							for (const part of parts) {
								const line = part.trim();
								if (!line) continue;
								if (line.startsWith("data: ")) {
									const data = line.slice(6).trim();
									if (data === "[DONE]") {
										controller.enqueue(encoder.encode(doneMarker()));
										continue;
									}
									try {
										const json = JSON.parse(data);
										const chunks = transformGoogleStreamChunk(json, id, created, mapped.model);
										for (const c of chunks) {
											controller.enqueue(encoder.encode(c));
										}
									} catch {
										// skip malformed chunk
									}
								} else if (line.startsWith("data:")) {
									const data = line.slice(5).trim();
									if (data === "[DONE]") {
										controller.enqueue(encoder.encode(doneMarker()));
										continue;
									}
									try {
										const json = JSON.parse(data);
										const chunks = transformGoogleStreamChunk(json, id, created, mapped.model);
										for (const c of chunks) {
											controller.enqueue(encoder.encode(c));
										}
									} catch {
									}
								}
							}
						}
						controller.enqueue(encoder.encode(doneMarker()));
					} catch (e) {
						// end stream
					} finally {
						controller.close();
					}
				},
			});
			
			return new Response(stream, {
				headers: {
					"content-type": "text/event-stream",
					"cache-control": "no-cache, no-transform",
					"connection": "keep-alive",
				},
			});
		} else {
			const res = await googleFetch(mapped.urlPath, {
				method: "POST",
				body: mapped.body,
			}, key);
			
			if (!res.ok) {
				let errText = await res.text();
				try {
					const errJson = JSON.parse(errText);
					const oe = toOpenAIError(errJson, res.status);
					return new Response(JSON.stringify(oe.body), { status: oe.status, headers: { "content-type": "application/json" } });
				} catch {
					return openAIError(res.status, errText || "Upstream error", "api_error");
				}
			}
			
			const json = await res.json();
			const openaiResp = googleToOpenAI(json, mapped.model);
			openaiResp.id = id;
			openaiResp.created = created;
			return new Response(JSON.stringify(openaiResp), {
				headers: { "content-type": "application/json" },
			});
		}
	} catch (e: any) {
		return openAIError(500, e?.message || "Internal server error", "api_error");
	}
}
