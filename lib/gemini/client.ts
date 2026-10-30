const GOOGLE_BASE = "https://generativelanguage.googleapis.com";
const DEFAULT_VERSION = "v1beta";

export async function googleFetch(
	path: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: any;
		stream?: boolean;
		timeoutMs?: number;
	},
	googleKey: string
): Promise<Response> {
	const method = options.method || "GET";
	const headers: Record<string, string> = {
		"x-goog-api-key": googleKey,
		...(options.headers || {}),
	};

	let body: BodyInit | undefined = undefined;
	if (options.body !== undefined && options.body !== null) {
		if (typeof options.body === "string") {
			body = options.body;
		} else {
			body = JSON.stringify(options.body);
			headers["content-type"] = headers["content-type"] || "application/json";
		}
	}

	const url = `${GOOGLE_BASE}/${DEFAULT_VERSION}/${path}`;

	const fetchOptions: RequestInit & { duplex?: "half" } = {
		method,
		headers,
		body,
	};

	if (options.stream) {
		fetchOptions.duplex = "half";
	} else {
		const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 120000;
		fetchOptions.signal = AbortSignal.timeout(timeoutMs);
	}

	const res = await fetch(url, fetchOptions as RequestInit);
	return res;
}
