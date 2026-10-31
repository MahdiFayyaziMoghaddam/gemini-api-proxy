function isLikelyGoogleKey(val: string): boolean {
	const v = val.trim();
	if (!v) return false;
	// Common Google API key format
	if (/^AIza[0-9A-Za-z_-]{35,}$/.test(v)) return true;
	// Be permissive for other key formats passed by custom providers
	if (v.length >= 20 && v.length <= 512 && !/\s/.test(v)) return true;
	return false;
}

export function extractGoogleApiKey(req: Request): string | null {
	const headers = req.headers;

	const auth = headers.get("authorization");
	if (auth) {
		const trimmed = auth.trim();
		if (trimmed) {
			const match = trimmed.match(/^(?:Bearer|Token|Key|ApiKey|OpenAI)\s+(.+)$/i);
			if (match && match[1]) {
				const key = match[1].trim();
				if (key) return key;
			} else if (!trimmed.includes(" ") && !trimmed.includes("\n") && !trimmed.includes("\r")) {
				return trimmed;
			}
		}
	}

	const proxyAuth = headers.get("proxy-authorization");
	if (proxyAuth) {
		const trimmed = proxyAuth.trim();
		if (trimmed) {
			const match = trimmed.match(/^(?:Bearer|Token|Key|ApiKey|OpenAI)\s+(.+)$/i);
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
		"openai-api-key",
		"x-openai-api-key",
		"x-openrouter-api-key",
		"x-or-api-key",
		"authorization-token",
		"x-auth-token",
		"x-access-token",
	];
	for (const h of googHeaders) {
		const val = headers.get(h);
		if (val && val.trim()) return val.trim();
	}

	try {
		const url = new URL(req.url);
		const keys = ["key", "api_key", "apikey", "google_api_key", "x-goog-api-key", "x_api_key", "token"];
		for (const k of keys) {
			const v = url.searchParams.get(k);
			if (v && v.trim()) return v.trim();
		}
	} catch {
		// ignore
	}

	// Last resort: scan all headers for a key-like value (for misnamed headers)
	for (const [name, value] of headers.entries()) {
		const n = name.toLowerCase();
		if (n.includes("authorization") || n.includes("api-key") || n.includes("apikey") || n === "key") {
			continue;
		}
		if (isLikelyGoogleKey(value)) {
			return value.trim();
		}
	}

	return null;
}

export function googleKeyHeader(key: string): Record<string, string> {
	return { "x-goog-api-key": key };
}
