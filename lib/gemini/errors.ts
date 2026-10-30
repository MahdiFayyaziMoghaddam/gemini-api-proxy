function mapErrorType(googleStatus?: string, httpStatus?: number): string {
	switch (googleStatus) {
		case "INVALID_ARGUMENT":
		case "UNAUTHENTICATED":
		case "PERMISSION_DENIED":
		case "NOT_FOUND":
			return "invalid_request_error";
		case "RESOURCE_EXHAUSTED":
			return "rate_limit_error";
		case "INTERNAL":
		case "UNAVAILABLE":
		case "DEADLINE_EXCEEDED":
			return "api_error";
		default:
			if (typeof httpStatus === "number") {
				if (httpStatus === 401 || httpStatus === 403) return "invalid_request_error";
				if (httpStatus === 404) return "invalid_request_error";
				if (httpStatus === 429) return "rate_limit_error";
				if (httpStatus >= 400 && httpStatus < 500) return "invalid_request_error";
			}
			return "api_error";
	}
}

export function toOpenAIError(input: unknown, defaultStatus = 500): { status: number; body: any } {
	if (input && typeof input === "object") {
		const anyInput = input as any;
		if (anyInput.error && typeof anyInput.error === "object") {
			const err = anyInput.error;
			const message = err.message || err.msg || "Unknown error";
			const httpStatus = typeof anyInput.status === "number" ? anyInput.status : (typeof err.status === "number" ? err.status : defaultStatus);
			const type = mapErrorType(typeof err.status === "string" ? err.status : undefined, httpStatus);
			const code = err.code || httpStatus;
			return {
				status: httpStatus,
				body: { error: { message, type, param: null, code } },
			};
		}
		if (typeof anyInput.status === "number" && typeof anyInput.message === "string") {
			return { status: anyInput.status, body: { error: { message: anyInput.message, type: mapErrorType(undefined, anyInput.status), param: null, code: anyInput.status } } };
		}
	}
	if (typeof input === "string") {
		return { status: defaultStatus, body: { error: { message: input, type: mapErrorType(undefined, defaultStatus), param: null, code: defaultStatus } } };
	}
	return { status: defaultStatus, body: { error: { message: "Internal server error", type: "api_error", param: null, code: defaultStatus } } };
}

export function openAIError(status: number, message: string, type?: string): Response {
	const t = type || mapErrorType(undefined, status);
	return new Response(JSON.stringify({ error: { message, type: t, param: null, code: status } }), {
		status,
		headers: { "content-type": "application/json" },
	});
}
