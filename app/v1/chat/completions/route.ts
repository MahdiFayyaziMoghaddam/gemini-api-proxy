import { createResponse, getApiKey, getClient } from "../../utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
	try {
		const apiKey = getApiKey(req.headers);
		if (!apiKey) {
			return createResponse(
				{ error: { message: "Missing API key", type: "authentication_error", param: null, code: 401 } },
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
		const openai = getClient(apiKey);
		const response = await openai.chat.completions.create(body);

		if (body?.stream !== true) {
			return createResponse(response, { status: 200, headers: { "content-type": "application/json" } });
		}

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				try {
					for await (const chunk of response as any) {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
					}
					controller.enqueue(encoder.encode("data: [DONE]\n\n"));
					controller.close();
				} catch (error) {
					controller.error(error);
				}
			}
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no"
			}
		});
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
