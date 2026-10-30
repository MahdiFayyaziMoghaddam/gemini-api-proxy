function mapFinishReason(reason: string | undefined): string {
	if (!reason) return "stop";
	switch (reason) {
		case "STOP": return "stop";
		case "MAX_TOKENS": return "length";
		case "SAFETY":
		case "RECITATION":
		case "BLOCKLIST":
		case "PROHIBITED_CONTENT":
		case "SPII":
			return "content_filter";
		default: return "stop";
	}
}

export function googleToOpenAI(googleResp: any, model: string) {
	const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	const created = Math.floor(Date.now() / 1000);
	const candidate = googleResp?.candidates?.[0];
	const parts = candidate?.content?.parts || [];

	let content = "";
	const toolCalls: any[] = [];

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part.text && !part.thought) {
			content += part.text;
		} else if (part.functionCall) {
			toolCalls.push({
				id: `call_${Date.now()}_${i}`,
				type: "function",
				function: {
					name: part.functionCall.name,
					arguments: JSON.stringify(part.functionCall.args || {}),
				},
			});
		}
	}

	const usage = googleResp?.usageMetadata ? {
		prompt_tokens: googleResp.usageMetadata.promptTokenCount || 0,
		completion_tokens: googleResp.usageMetadata.candidatesTokenCount || 0,
		total_tokens: googleResp.usageMetadata.totalTokenCount || 0,
	} : undefined;

	const message: any = {
		role: "assistant",
		content: content || null,
	};
	if (toolCalls.length > 0) {
		message.tool_calls = toolCalls;
	}

	return {
		id,
		object: "chat.completion",
		created,
		model,
		choices: [{
			index: 0,
			message,
			finish_reason: mapFinishReason(candidate?.finishReason),
		}],
		...(usage ? { usage } : {}),
	};
}

export function googleModelToOpenAI(gModel: any) {
	const name = gModel?.name || gModel?.baseModelId || "";
	const id = name.startsWith("models/") ? name.slice("models/".length) : name.startsWith("tunedModels/") ? name : name;
	return {
		id,
		object: "model",
		created: Math.floor(Date.now() / 1000),
		owned_by: "google",
	};
}

export function googleModelsListToOpenAI(listResp: any) {
	const models = (listResp?.models || []).map((m: any) => googleModelToOpenAI(m));
	return {
		object: "list",
		data: models,
	};
}
