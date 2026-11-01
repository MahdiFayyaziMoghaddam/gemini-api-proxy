import { extractKey } from "../../../../lib/gemini/auth";
import { geminiFetch } from "../../../../lib/gemini/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ model: string }> }) {
	try {
		const key = extractKey(req);
		const { model } = await params;
		const mid = decodeURIComponent(model).replace("models/", "");
		if (!key) return new Response(JSON.stringify({ id: mid, object: "model", created: 1718659200, owned_by: "google" }), { headers: { "content-type": "application/json" } });
		try {
			const res = await geminiFetch(`models/${mid}`, key, { method: "GET" });
			if (res.ok) return new Response(JSON.stringify({ id: mid, object: "model", created: 1718659200, owned_by: "google" }), { headers: { "content-type": "application/json" } });
		} catch {}
		return new Response(JSON.stringify({ id: mid, object: "model", created: 1718659200, owned_by: "google" }), { headers: { "content-type": "application/json" } });
	} catch {
		return new Response(JSON.stringify({ id: "gemini-3.5-flash", object: "model", created: 1718659200, owned_by: "google" }), { headers: { "content-type": "application/json" } });
	}
}
