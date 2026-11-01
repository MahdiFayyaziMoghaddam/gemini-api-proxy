export type OpenAIError = {
	error: {
		message: string;
		type: string;
		param: any;
		code: string | number | null;
	};
};

export function openAIErrorResponse(status: number, message: string, type = "api_error", code: string | number | null = null): Response {
	const body: OpenAIError = {
		error: {
			message,
			type,
			param: null,
			code: code ?? status,
		},
	};
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export function mapGeminiErrorToOpenAI(err: any, status?: number): { status: number; body: OpenAIError } {
	const httpStatus = typeof status === "number" ? status : typeof err?.error?.code === "number" ? err.error.code : 500;
	let type = "api_error";
	if (httpStatus === 401 || httpStatus === 403) type = "authentication_error";
	else if (httpStatus === 429) type = "rate_limit_error";
	else if (httpStatus >= 400 && httpStatus < 500) type = "invalid_request_error";
	
	const message = err?.error?.message || err?.message || "Unknown error";
	const code = err?.error?.status || httpStatus;
	
	return {
		status: httpStatus,
		body: {
			error: {
				message,
				type,
				param: null,
				code,
			},
		},
	};
}
