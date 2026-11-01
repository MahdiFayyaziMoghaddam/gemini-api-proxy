const BASE = "https://generativelanguage.googleapis.com";
const VERSION = "v1beta";

function isApiKey(key: string) {
	return /^AIza[0-9A-Za-z_-]{35,}$/.test(key);
}

export async function geminiFetch(path: string, key: string, init: RequestInit & { stream?: boolean; timeoutMs?: number } = {}) {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		...(init.headers as Record<string, string> || {}),
	};

	if (key) {
		if (isApiKey(key)) {
			headers["x-goog-api-key"] = key;
		} else {
			headers["authorization"] = `Bearer ${key}`;
		}
	}

	const url = `${BASE}/${VERSION}/${path}`;
	const opts: RequestInit & { duplex?: "half" } = {
		method: init.method || "GET",
		headers,
		body: init.body,
	};

	if (init.stream) {
		opts.duplex = "half";
	} else if (init.timeoutMs || true) {
		// timeout handled by caller if needed
	}

	return fetch(url, opts);
}
