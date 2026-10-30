import { bareModelId, normalizeModel } from "./models-alias";

export interface OpenAIChatBody {
	model?: string;
	messages?: Array<any>;
	stream?: boolean;
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	max_completion_tokens?: number;
	stop?: string | string[];
	tools?: Array<any>;
	tool_choice?: any;
	response_format?: any;
	[key: string]: any;
}

function mapContentPart(part: any): any[] {
	if (!part) return [];
	if (typeof part === "string") {
		return [{ text: part }];
	}
	if (part.type === "text" && part.text) {
		return [{ text: part.text }];
	}
	if (part.type === "image_url" && part.image_url?.url) {
		const url = part.image_url.url;
		if (url.startsWith("data:")) {
			const match = url.match(/^data:([^;]+);base64,(.+)$/);
			if (match) {
				return [{ inlineData: { mimeType: match[1], data: match[2] } }];
			}
		}
		// For non-data URLs, skip silently as per requirements
		return [];
	}
	if (part.type === "thought") {
		return [{ thought: true, text: part.thought || part.text || "" }];
	}
	return [];
}

function mapMessage(
	msg: any,
	toolNames: Map<string, string>
): { contents: any[]; systemParts: any[] } {
	const role = msg.role;
	const systemParts: any[] = [];
	const contents: any[] = [];

	if (role === "system") {
		if (typeof msg.content === "string") {
			systemParts.push({ text: msg.content });
		} else if (Array.isArray(msg.content)) {
			for (const p of msg.content) {
				systemParts.push(...mapContentPart(p));
			}
		}
		return { contents, systemParts };
	}

	if (role === "user") {
		const parts: any[] = [];
		if (typeof msg.content === "string") {
			parts.push({ text: msg.content });
		} else if (Array.isArray(msg.content)) {
			for (const p of msg.content) {
				parts.push(...mapContentPart(p));
			}
		}
		if (parts.length > 0) {
			contents.push({ role: "user", parts });
		}
		return { contents, systemParts };
	}

	if (role === "assistant") {
		const parts: any[] = [];
		if (msg.content !== null && msg.content !== undefined) {
			if (typeof msg.content === "string") {
				if (msg.content) parts.push({ text: msg.content });
			} else if (Array.isArray(msg.content)) {
				for (const p of msg.content) {
					parts.push(...mapContentPart(p));
				}
			}
		}
		if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
			for (const tc of msg.tool_calls) {
				if (tc.function) {
					let args: any = {};
					try {
						if (typeof tc.function.arguments === "string") {
							args = JSON.parse(tc.function.arguments);
						} else {
							args = tc.function.arguments || {};
						}
					} catch {
						args = {};
					}
					if (tc.id && tc.function.name) {
						toolNames.set(tc.id, tc.function.name);
					}
					parts.push({ functionCall: { name: tc.function.name, args } });
				}
			}
		}
		if (parts.length === 0 && msg.content) {
			parts.push({ text: String(msg.content) });
		}
		if (parts.length > 0) {
			contents.push({ role: "model", parts });
		}
		return { contents, systemParts };
	}

	if (role === "tool") {
		let response: any = msg.content;
		try {
			if (typeof response === "string") {
				response = JSON.parse(response);
			}
		} catch {
			response = { result: response };
		}
		let name = msg.name;
		if (!name && msg.tool_call_id) {
			name = toolNames.get(msg.tool_call_id);
		}
		if (!name) name = "tool";
		contents.push({ role: "user", parts: [{ functionResponse: { name, response } }] });
		return { contents, systemParts };
	}

	return { contents, systemParts };
}

export function openaiChatToGoogle(body: OpenAIChatBody) {
	const resource = normalizeModel(body.model);
	const stream = body.stream === true;
	const contents: any[] = [];
	const systemParts: any[] = [];
	const toolNames = new Map<string, string>();

	if (body.messages && Array.isArray(body.messages)) {
		for (const msg of body.messages) {
			const mapped = mapMessage(msg, toolNames);
			if (mapped.systemParts.length > 0) systemParts.push(...mapped.systemParts);
			if (mapped.contents.length > 0) contents.push(...mapped.contents);
		}
	}

	const requestBody: any = { contents };
	if (systemParts.length > 0) {
		requestBody.systemInstruction = { parts: systemParts };
	}

	const generationConfig: any = {};
	if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
	if (typeof body.top_p === "number") generationConfig.topP = body.top_p;
	if (typeof body.max_tokens === "number") generationConfig.maxOutputTokens = body.max_tokens;
	else if (typeof body.max_completion_tokens === "number") generationConfig.maxOutputTokens = body.max_completion_tokens;
	if (body.stop) generationConfig.stopSequences = Array.isArray(body.stop) ? body.stop : [body.stop];

	if (body.response_format) {
		if (body.response_format.type === "json_object") {
			generationConfig.responseMimeType = "application/json";
		} else if (body.response_format.type === "json_schema" && body.response_format.json_schema) {
			generationConfig.responseMimeType = "application/json";
			if (body.response_format.json_schema.schema) {
				generationConfig.responseSchema = body.response_format.json_schema.schema;
			} else {
				generationConfig.responseSchema = body.response_format.json_schema;
			}
		}
	}

	if (Object.keys(generationConfig).length > 0) {
		requestBody.generationConfig = generationConfig;
	}

	if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
		const functionDeclarations: any[] = [];
		for (const tool of body.tools) {
			if (tool.type === "function" && tool.function) {
				const fn: any = { name: tool.function.name };
				if (tool.function.description) fn.description = tool.function.description;
				if (tool.function.parameters) fn.parameters = tool.function.parameters;
				functionDeclarations.push(fn);
			}
		}
		if (functionDeclarations.length > 0) {
			requestBody.tools = [{ functionDeclarations }];
		}
	}

	const urlPath = stream ? `${resource}:streamGenerateContent?alt=sse` : `${resource}:generateContent`;

	return { model: bareModelId(resource), urlPath, body: requestBody, stream };
}
