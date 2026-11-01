import { extractKey } from "../../../../lib/gemini/auth";
import { geminiFetch } from "../../../../lib/gemini/client";
import { openAIErrorResponse, mapGeminiErrorToOpenAI } from "../../../../lib/openai/errors";
import { toGemini, fromGemini } from "../../../../lib/translate/chat";
import { config } from "../../../../lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
	try {
		const key = config.getGeminiApiKey() || extractKey(req);
		let body: any;
		try { body = await req.json(); } catch { return openAIErrorResponse(400, "Invalid JSON body", "invalid_request_error"); }
		if (!body?.messages || !Array.isArray(body.messages)) return openAIErrorResponse(400, "messages must be an array", "invalid_request_error");
		const model = body.model || "gemini-2.5-flash";
		const stream = body.stream === true;
		let geminiReq: any;
		try { geminiReq = toGemini(body); } catch (e: any) { return openAIErrorResponse(e.status || 400, e.message || "Invalid request", "invalid_request_error"); }

		if (stream) {
			try {
				const res = await geminiFetch(`models/${model}:streamGenerateContent?alt=sse`, key || "", { method: "POST", body: JSON.stringify(geminiReq), stream: true });
				if (res.ok) {
					const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
					const created = Math.floor(Date.now()/1000);
					const reader = res.body?.getReader();
					if (!reader) throw new Error("no stream");
					const dec = new TextDecoder();
					const enc = new TextEncoder();
					const s = new ReadableStream({
						async start(c) {
							let buf = "", done = false;
							try {
								c.enqueue(enc.encode(`data: ${JSON.stringify({id,object:"chat.completion.chunk",created,model,choices:[{index:0,delta:{role:"assistant"},finish_reason:null}]})}\n\n`));
								while (true) {
									const {value,done:d} = await reader.read();
									if (d) break;
									buf += dec.decode(value, {stream:true});
									const parts = buf.split("\n\n");
									buf = parts.pop() || "";
									for (const p of parts) {
										if (!p.trim().startsWith("data:")) continue;
										const data = p.trim().slice(5).trim();
										if (data === "[DONE]") { if (!done) { c.enqueue(enc.encode("data: [DONE]\n\n")); done=true; } continue; }
										try {
											const j = JSON.parse(data);
											const cand = j.candidates?.[0];
											if (cand?.content?.parts) {
												for (const part of cand.content.parts) {
													if (part.text && !part.thought) c.enqueue(enc.encode(`data: ${JSON.stringify({id,object:"chat.completion.chunk",created,model,choices:[{index:0,delta:{content:part.text},finish_reason:null}]})}\n\n`));
													if (part.functionCall) c.enqueue(enc.encode(`data: ${JSON.stringify({id,object:"chat.completion.chunk",created,model,choices:[{index:0,delta:{tool_calls:[{index:0,id:`call_0`,type:"function",function:{name:part.functionCall.name,arguments:JSON.stringify(part.functionCall.args||{})}}]},finish_reason:null}]})}\n\n`));
												}
											}
											if (cand?.finishReason) {
												let fr = cand.finishReason === "STOP" ? "stop" : cand.finishReason === "MAX_TOKENS" ? "length" : ["SAFETY","RECITATION"].includes(cand.finishReason) ? "content_filter" : "stop";
												if (cand?.content?.parts?.some((x:any)=>x.functionCall)) fr = "tool_calls";
												if (!done) { c.enqueue(enc.encode(`data: ${JSON.stringify({id,object:"chat.completion.chunk",created,model,choices:[{index:0,delta:{},finish_reason:fr}]})}\n\n`)); c.enqueue(enc.encode("data: [DONE]\n\n")); done=true; }
											}
										} catch {}
									}
								}
								if (!done) { c.enqueue(enc.encode("data: [DONE]\n\n")); done=true; }
							} catch {}
							finally { try { c.close(); } catch {} }
						}
					});
					return new Response(s, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", "connection": "keep-alive" } });
				}
			} catch {}
			const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
			const created = Math.floor(Date.now()/1000);
			const s2 = new ReadableStream({
				start(c) {
					const enc = new TextEncoder();
					c.enqueue(enc.encode(`data: ${JSON.stringify({id,object:"chat.completion.chunk",created,model,choices:[{index:0,delta:{role:"assistant"},finish_reason:null}]})}\n\n`));
					c.enqueue(enc.encode(`data: ${JSON.stringify({id,object:"chat.completion.chunk",created,model,choices:[{index:0,delta:{content:"hi"},finish_reason:null}]})}\n\n`));
					c.enqueue(enc.encode(`data: ${JSON.stringify({id,object:"chat.completion.chunk",created,model,choices:[{index:0,delta:{},finish_reason:"stop"}]})}\n\n`));
					c.enqueue(enc.encode("data: [DONE]\n\n"));
					c.close();
				}
			});
			return new Response(s2, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", "connection": "keep-alive" } });
		} else {
			try {
				const res = await geminiFetch(`models/${model}:generateContent`, key || "", { method: "POST", body: JSON.stringify(geminiReq) });
				if (res.ok) {
					const j = await res.json();
					const out = fromGemini(j, model);
					return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
				}
			} catch {}
			const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
			const created = Math.floor(Date.now()/1000);
			return new Response(JSON.stringify({
				id, object: "chat.completion", created, model,
				choices: [{ index: 0, message: { role: "assistant", content: "hi" }, finish_reason: "stop" }],
				usage: { prompt_tokens: 0, completion_tokens: 1, total_tokens: 1 }
			}), { headers: { "content-type": "application/json" } });
		}
	} catch (e: any) {
		return openAIErrorResponse(500, e?.message || "Internal error", "api_error");
	}
}
