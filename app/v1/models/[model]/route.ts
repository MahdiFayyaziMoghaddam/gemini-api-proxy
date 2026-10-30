import { extractGoogleApiKey } from "../../../../lib/gemini/headers";
import { googleFetch } from "../../../../lib/gemini/client";
import { googleModelToOpenAI } from "../../../../lib/gemini/map-response";
import { toOpenAIError, openAIError } from "../../../../lib/gemini/errors";
import { normalizeModel } from "../../../../lib/gemini/models-alias";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ model: string }> }) {
	try {
		const key = extractGoogleApiKey(req);
		if (!key) {
			return openAIError(401, "Missing API key. Provide Authorization: Bearer <GOOGLE_API_KEY> or x-goog-api-key.", "invalid_request_error");
		}

		const { model } = await params;
		const modelId = decodeURIComponent(model);
		const resource = normalizeModel(modelId);
		const path = resource;

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
		const openaiResp = googleModelToOpenAI(json);
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
