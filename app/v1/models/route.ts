import { extractKey } from "../../../lib/gemini/auth";
import { geminiFetch } from "../../../lib/gemini/client";
import { openAIErrorResponse, mapGeminiErrorToOpenAI } from "../../../lib/openai/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const STATIC = {
	object: "list",
	data: [
		{ id: "gemini-2.5-flash", object: "model", created: 1718659200, owned_by: "google" },
		{ id: "gemini-2.5-pro", object: "model", created: 1718659200, owned_by: "google" },
		{ id: "gemini-2.5-flash-lite", object: "model", created: 1718659200, owned_by: "google" },
		{ id: "gemini-2.0-flash", object: "model", created: 1718659200, owned_by: "google" },
		{ id: "gemini-3.5-flash", object: "model", created: 1718659200, owned_by: "google" },
	],
};

export async function GET(req: Request) {
	try {
		const key = extractKey(req);
		if (!key) return new Response(JSON.stringify(STATIC), { headers: { "content-type": "application/json" } });
		try {
			const res = await geminiFetch("models?pageSize=1000", key, { method: "GET" });
			if (res.ok) {
				const j: any = await res.json();
				const data = (j.models || []).map((m: any) => ({ id: String(m.name||"").replace("models/",""), object: "model", created: 1718659200, owned_by: "google" }));
				return new Response(JSON.stringify({ object: "list", data }), { headers: { "content-type": "application/json" } });
			}
		} catch {}
		return new Response(JSON.stringify(STATIC), { headers: { "content-type": "application/json" } });
	} catch (e: any) {
		return new Response(JSON.stringify(STATIC), { headers: { "content-type": "application/json" } });
	}
}
