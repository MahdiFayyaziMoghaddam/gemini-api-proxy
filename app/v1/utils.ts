import { OpenAI } from "openai";

export interface ModelsResponse {
	object: "list";
	data: OpenAI.Model[];
}

export const getClient = (apiKey?: string) => {
	const openai = new OpenAI({
		apiKey,
		baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
		adminAPIKey: apiKey
	});
	return openai;
};

export const createResponse = <T>(body: T, init?: ResponseInit) => {
	return new Response(JSON.stringify(body), init);
};

export const getApiKey = (headers: Headers) => headers.get("authorization")?.replace(/^Bearer\s+/i, "");
