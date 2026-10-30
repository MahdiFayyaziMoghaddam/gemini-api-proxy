export function extractGoogleApiKey(req: Request): string | null {
	const auth = req.headers.get("authorization") || req.headers.get("Authorization");
	if (auth) {
		const match = auth.match(/^Bearer\s+(.+)$/i);
		if (match && match[1]) return match[1].trim();
	}
	const goog = req.headers.get("x-goog-api-key") || req.headers.get("X-Goog-Api-Key");
	if (goog && goog.trim()) return goog.trim();
	return null;
}

export function googleKeyHeader(key: string): Record<string, string> {
	return { "x-goog-api-key": key };
}
