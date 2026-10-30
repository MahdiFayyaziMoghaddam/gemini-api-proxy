export function toOpenAIError(input: unknown, defaultStatus = 500): { status: number; body: any } {
	if (input && typeof input === "object") {
		const anyInput = input as any;
		if (anyInput.error && typeof anyInput.error === "object") {
			const err = anyInput.error;
			const message = err.message || err.msg || "Unknown error";
			const type = err.status || err.type || "api_error";
			const code = err.code || anyInput.status || defaultStatus;
			return {
				status: typeof anyInput.status === "number" ? anyInput.status : (typeof err.status === "number" ? err.status : defaultStatus),
				body: { error: { message, type, param: null, code } },
			};
		}
		if (typeof anyInput.status === "number" && typeof anyInput.message === "string") {
			return { status: anyInput.status, body: { error: { message: anyInput.message, type: "api_error", param: null, code: anyInput.status } } };
		}
	}
	if (typeof input === "string") {
		return { status: defaultStatus, body: { error: { message: input, type: "api_error", param: null, code: defaultStatus } } };
	}
	return { status: defaultStatus, body: { error: { message: "Internal server error", type: "api_error", param: null, code: defaultStatus } } };
}

export function openAIError(status: number, message: string, type = "invalid_request_error"): Response {
	return new Response(JSON.stringify({ error: { message, type, param: null, code: status } }), {
		status,
		headers: { "content-type": "application/json" },
	});
}
