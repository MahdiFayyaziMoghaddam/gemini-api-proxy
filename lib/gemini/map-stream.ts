function mapFinishReason(reason: string | undefined): string | null {
	if (!reason) return null;
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

export function createChatCompletionChunk(id: string, created: number, model: string, delta: any, finish_reason: string | null = null) {
	return {
		id,
		object: "chat.completion.chunk",
		created,
		model,
		choices: [{
			index: 0,
			delta,
			finish_reason,
		}],
	};
}

export interface StreamCtx {
	toolCallIds: Map<number, string>;
	toolCallCounter: number;
}

export function createStreamCtx(): StreamCtx {
	return { toolCallIds: new Map<number, string>(), toolCallCounter: 0 };
}

export function transformGoogleStreamChunk(chunk: any, id: string, created: number, model: string, ctx?: StreamCtx): string[] {
	const lines: string[] = [];
	const candidate = chunk?.candidates?.[0];
	if (!candidate) return lines;

	const parts = candidate?.content?.parts || [];
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part.text && !part.thought) {
			const chunkObj = createChatCompletionChunk(id, created, model, { content: part.text }, null);
			lines.push(`data: ${JSON.stringify(chunkObj)}\n\n`);
		} else if (part.functionCall) {
			if (!ctx) {
				const delta = {
					tool_calls: [{
						index: 0,
						id: `call_${Date.now()}_${i}`,
						type: "function",
						function: {
							name: part.functionCall.name,
							arguments: JSON.stringify(part.functionCall.args || {}),
						},
					}],
				};
				const chunkObj = createChatCompletionChunk(id, created, model, delta, null);
				lines.push(`data: ${JSON.stringify(chunkObj)}\n\n`);
			} else {
				if (!ctx.toolCallIds.has(i)) {
					ctx.toolCallCounter += 1;
					ctx.toolCallIds.set(i, `call_${ctx.toolCallCounter}`);
				}
				const callId = ctx.toolCallIds.get(i)!;
				const delta = {
					tool_calls: [{
						index: ctx.toolCallCounter - 1,
						id: callId,
						type: "function",
						function: {
							name: part.functionCall.name,
							arguments: JSON.stringify(part.functionCall.args || {}),
						},
					}],
				};
				const chunkObj = createChatCompletionChunk(id, created, model, delta, null);
				lines.push(`data: ${JSON.stringify(chunkObj)}\n\n`);
			}
		}
	}

	const finish = mapFinishReason(candidate?.finishReason);
	if (finish) {
		const chunkObj = createChatCompletionChunk(id, created, model, {}, finish);
		lines.push(`data: ${JSON.stringify(chunkObj)}\n\n`);
	}

	return lines;
}

export function doneMarker(): string {
	return "data: [DONE]\n\n";
}

export function normalizeSSE(text: string): string {
	return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function parseSSEBlocks(buffer: string): { blocks: string[]; rest: string } {
	const normalized = normalizeSSE(buffer);
	const parts = normalized.split("\n\n");
	const rest = parts.pop() ?? "";
	return { blocks: parts, rest };
}

export function dataFromBlock(block: string): string | null {
	const lines = block.split("\n");
	for (const line of lines) {
		if (line.startsWith("data:")) {
			return line.slice(5).trim();
		}
	}
	return null;
}
