export function extractKey(req: Request): string | null {
	const headers = req.headers;
	const auth = headers.get("authorization");
	if (auth) {
		const t = auth.trim();
		const m = t.match(/^(?:Bearer|Token|Key|ApiKey|OpenAI)\s+(.+)$/i);
		if (m?.[1]) return m[1].trim();
		if (!t.includes(" ") && !t.includes("\n")) return t;
	}
	const p = headers.get("proxy-authorization");
	if (p) {
		const t = p.trim();
		const m = t.match(/^(?:Bearer|Token|Key|ApiKey|OpenAI)\s+(.+)$/i);
		if (m?.[1]) return m[1].trim();
		if (!t.includes(" ") && !t.includes("\n")) return t;
	}
	for (const h of ["x-goog-api-key", "x-goog-key", "goog-api-key", "x-api-key", "api-key", "x-api-token", "openai-api-key", "x-openai-api-key"]) {
		const v = headers.get(h);
		if (v?.trim()) return v.trim();
	}
	try {
		const url = new URL(req.url);
		for (const k of ["key", "api_key", "apikey", "google_api_key", "x-goog-api-key"]) {
			const v = url.searchParams.get(k);
			if (v?.trim()) return v.trim();
		}
	} catch {}
	return null;
}
