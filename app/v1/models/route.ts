import { createResponse, getApiKey, getClient, ModelsResponse } from "../utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
	const apiKey = getApiKey(req.headers);
	if (!apiKey) {
		return createResponse(
			{ error: { message: "Missing API key", type: "invalid_request_error", param: null, code: 401 } },
			{ status: 401, headers: { "content-type": "application/json" } }
		);
	}
	const openai = getClient(apiKey);
	try {
		const models = [];
		const list = await openai.models.list();
		for await (const model of list) {
			models.push(model);
		}
		return createResponse<ModelsResponse>(
			{ data: models, object: "list" },
			{ status: 200, headers: { "content-type": "application/json" } }
		);
	} catch (error: any) {
		const err = error?.error ?? {
			message: error?.message ?? "Internal server error",
			type: "api_error",
			param: null,
			code: error?.status ?? 500
		};
		return createResponse(
			{ error: err },
			{ status: error?.status ?? 500, headers: { "content-type": "application/json" } }
		);
	}
}
