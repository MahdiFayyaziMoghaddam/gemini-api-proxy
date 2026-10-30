import { extractGoogleApiKey } from "../../../lib/gemini/headers";
import { googleFetch } from "../../../lib/gemini/client";
import { googleModelsListToOpenAI } from "../../../lib/gemini/map-response";
import { toOpenAIError, openAIError } from "../../../lib/gemini/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
	try {
		const key = extractGoogleApiKey(req);
		if (!key) {
			return openAIError(401, "Missing API key. Provide Authorization: Bearer <GOOGLE_API_KEY> or x-goog-api-key.", "invalid_request_error");
		}

		const { searchParams } = new URL(req.url);
		const sp = new URLSearchParams();
		const pageSize = searchParams.get("pageSize");
		const pageToken = searchParams.get("pageToken");
		if (pageSize) sp.set("pageSize", pageSize);
		if (pageToken) sp.set("pageToken", pageToken);
		let path = "models";
		const qs = sp.toString();
		if (qs) path += `?${qs}`;

		const res = await googleFetch(path, { method: "GET" }, key);
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
		const openaiResp = googleModelsListToOpenAI(json);
		return new Response(JSON.stringify(openaiResp), {
			headers: { "content-type": "application/json" },
		});
	} catch (e: any) {
		if (e?.name === "TimeoutError" || e?.code === "ABORT_ERR") {
			return openAIError(504, "Upstream request timed out", "api_error");
		}
		return openAIError(500, e?.message || "Internal server error", "api_error");
	}
}
