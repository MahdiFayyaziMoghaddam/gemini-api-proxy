import { createResponse, getApiKey, getClient } from "../../utils";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ model: string }> }) {
	try {
		const { model: modelId } = await params;
		const apiKey = getApiKey(req.headers);
		if (!apiKey) {
			return createResponse(
				{ error: { message: "Missing API key", type: "invalid_request_error", param: null, code: 401 } },
				{ status: 401, headers: { "content-type": "application/json" } }
			);
		}
		const openai = getClient(apiKey);
		const model = await openai.models.retrieve(modelId);
		return createResponse(model, { status: 200, headers: { "content-type": "application/json" } });
	} catch (error: any) {
		const err = error?.error ?? { message: error?.message ?? "Internal server error", type: "api_error", param: null, code: error?.status ?? 500 };
		return createResponse({ error: err }, { status: error?.status ?? 500, headers: { "content-type": "application/json" } });
	}
}
