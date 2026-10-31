export function extractGoogleApiKey(req: Request): string | null {
	const headers = req.headers;

	const auth = headers.get("authorization");
	if (auth) {
		const trimmed = auth.trim();
		if (trimmed) {
			const match = trimmed.match(/^Bearer\s+(.+)$/i);
			if (match && match[1]) {
				const key = match[1].trim();
				if (key) return key;
			} else if (!trimmed.includes(" ") && !trimmed.includes("\n") && !trimmed.includes("\r")) {
				// Some clients send the raw key without "Bearer " prefix
				return trimmed;
			}
		}
	}

	const proxyAuth = headers.get("proxy-authorization");
	if (proxyAuth) {
		const trimmed = proxyAuth.trim();
		if (trimmed) {
			const match = trimmed.match(/^Bearer\s+(.+)$/i);
			if (match && match[1]) {
				const key = match[1].trim();
				if (key) return key;
			} else if (!trimmed.includes(" ") && !trimmed.includes("\n") && !trimmed.includes("\r")) {
				return trimmed;
			}
		}
	}

	const googHeaders = [
		"x-goog-api-key",
		"x-goog-key",
		"goog-api-key",
		"x-api-key",
		"api-key",
		"x-api-token",
	];
	for (const h of googHeaders) {
		const val = headers.get(h);
		if (val && val.trim()) return val.trim();
	}

	try {
		const url = new URL(req.url);
		const keys = ["key", "api_key", "apikey", "google_api_key", "x-goog-api-key", "x_api_key"];
		for (const k of keys) {
			const v = url.searchParams.get(k);
			if (v && v.trim()) return v.trim();
		}
	} catch {
		// ignore
	}

	return null;
}

export function googleKeyHeader(key: string): Record<string, string> {
	return { "x-goog-api-key": key };
}
