import { createResponse, getApiKey, getClient } from "../../utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
	try {
		const apiKey = getApiKey(req.headers);
		if (!apiKey) {
			return createResponse(
				{ error: { message: "Missing API key", type: "invalid_request_error", param: null, code: 401 } },
				{ status: 401, headers: { "content-type": "application/json" } }
			);
		}
		let body: any;
		try {
			body = await req.json();
		} catch {
			return createResponse(
				{ error: { message: "Invalid JSON body", type: "invalid_request_error", param: null, code: 400 } },
				{ status: 400, headers: { "content-type": "application/json" } }
			);
		}
		if (body?.stream) {
			return createResponse(
				{ error: { message: "Streaming is not supported", type: "invalid_request_error", param: "stream", code: 400 } },
				{ status: 400, headers: { "content-type": "application/json" } }
			);
		}
		const openai = getClient(apiKey);
		const completion = await openai.chat.completions.create(body);
		return createResponse(completion, { status: 200, headers: { "content-type": "application/json" } });
	} catch (error: any) {
		const err = error?.error ?? { message: error?.message ?? "Internal server error", type: "api_error", param: null, code: error?.status ?? 500 };
		return createResponse({ error: err }, { status: error?.status ?? 500, headers: { "content-type": "application/json" } });
	}
}
