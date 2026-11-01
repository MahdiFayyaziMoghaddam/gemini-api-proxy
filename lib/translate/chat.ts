export function toGemini(body: any) {
	if (!body || !Array.isArray(body.messages)) throw { status: 400, message: "messages must be an array" };
	const contents: any[] = [];
	const systemParts: any[] = [];
	for (const msg of body.messages) {
		if (!msg || typeof msg.role !== "string") continue;
		if (msg.role === "system") {
			if (typeof msg.content === "string" && msg.content) systemParts.push({ text: msg.content });
			else if (Array.isArray(msg.content)) {
				for (const p of msg.content) {
					if (typeof p === "string") systemParts.push({ text: p });
					else if (p?.type === "text" && p.text) systemParts.push({ text: p.text });
				}
			}
			continue;
		}
		if (msg.role === "user") {
			const parts: any[] = [];
			if (typeof msg.content === "string") parts.push({ text: msg.content });
			else if (Array.isArray(msg.content)) {
				for (const p of msg.content) {
					if (typeof p === "string") parts.push({ text: p });
					else if (p?.type === "text" && p.text) parts.push({ text: p.text });
					else if (p?.type === "image_url" && p.image_url?.url?.startsWith("data:")) {
						const m = p.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
						if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
					}
				}
			}
			if (parts.length) contents.push({ role: "user", parts });
			continue;
		}
		if (msg.role === "assistant") {
			const parts: any[] = [];
			if (typeof msg.content === "string" && msg.content) parts.push({ text: msg.content });
			else if (Array.isArray(msg.content)) {
				for (const p of msg.content) {
					if (typeof p === "string") parts.push({ text: p });
					else if (p?.type === "text" && p.text) parts.push({ text: p.text });
				}
			}
			if (Array.isArray(msg.tool_calls)) {
				for (const tc of msg.tool_calls) {
					if (tc?.function) {
						let args: any = {};
						try {
							args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : (tc.function.arguments || {});
						} catch { args = {}; }
						parts.push({ functionCall: { name: tc.function.name, args } });
					}
				}
			}
			if (parts.length) contents.push({ role: "model", parts });
			continue;
		}
		if (msg.role === "tool") {
			let resp: any = msg.content;
			try { if (typeof resp === "string") resp = JSON.parse(resp); } catch { resp = { result: resp }; }
			contents.push({ role: "user", parts: [{ functionResponse: { name: msg.name || "tool", response: resp } }] });
			continue;
		}
	}
	const req: any = { contents };
	if (systemParts.length) req.systemInstruction = { parts: systemParts };
	const cfg: any = {};
	if (typeof body.temperature === "number") cfg.temperature = body.temperature;
	if (typeof body.top_p === "number") cfg.topP = body.top_p;
	if (typeof body.max_tokens === "number") cfg.maxOutputTokens = body.max_tokens;
	else if (typeof body.max_completion_tokens === "number") cfg.maxOutputTokens = body.max_completion_tokens;
	if (body.stop) cfg.stopSequences = Array.isArray(body.stop) ? body.stop.slice(0, 5) : [body.stop];
	if (body.response_format?.type === "json_object") cfg.responseMimeType = "application/json";
	if (body.response_format?.type === "json_schema") {
		cfg.responseMimeType = "application/json";
		if (body.response_format.json_schema?.schema) cfg.responseSchema = body.response_format.json_schema.schema;
		else cfg.responseSchema = body.response_format.json_schema;
	}
	if (Object.keys(cfg).length) req.generationConfig = cfg;
	if (Array.isArray(body.tools) && body.tools.length) {
		const fns: any[] = [];
		for (const t of body.tools) {
			if (t?.type === "function" && t.function?.name) {
				fns.push({ name: t.function.name, description: t.function.description, parameters: t.function.parameters });
			}
		}
		if (fns.length) req.tools = [{ functionDeclarations: fns }];
	}
	if (body.tool_choice === "none") delete req.tools;
	else if (body.tool_choice === "required") req.toolConfig = { functionCallingConfig: { mode: "ANY" } };
	else if (body.tool_choice === "auto") req.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
	else if (typeof body.tool_choice === "object" && body.tool_choice?.function?.name) req.toolConfig = { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [body.tool_choice.function.name] } };
	return req;
}

function finish(r: string | undefined, tc = false) {
	if (tc) return "tool_calls";
	if (r === "STOP") return "stop";
	if (r === "MAX_TOKENS") return "length";
	if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(r || "")) return "content_filter";
	return "stop";
}

export function fromGemini(resp: any, model: string) {
	const id = `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	const created = Math.floor(Date.now() / 1000);
	const cands = resp?.candidates || [];
	const choices = cands.map((cand: any, i: number) => {
		const parts = cand?.content?.parts || [];
		let content = "";
		const tcs: any[] = [];
		for (let j = 0; j < parts.length; j++) {
			if (parts[j].text && !parts[j].thought) content += parts[j].text;
			if (parts[j].functionCall) tcs.push({ id: `call_${i}_${j}`, type: "function", function: { name: parts[j].functionCall.name, arguments: JSON.stringify(parts[j].functionCall.args || {}) } });
		}
		const msg: any = { role: "assistant", content: content || null };
		if (tcs.length) msg.tool_calls = tcs;
		return { index: i, message: msg, finish_reason: finish(cand?.finishReason, tcs.length > 0) };
	});
	if (choices.length === 0) choices.push({ index: 0, message: { role: "assistant", content: null }, finish_reason: "stop" });
	const usage = resp?.usageMetadata ? {
		prompt_tokens: resp.usageMetadata.promptTokenCount || 0,
		completion_tokens: resp.usageMetadata.candidatesTokenCount || 0,
		total_tokens: resp.usageMetadata.totalTokenCount || 0,
	} : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
	return { id, object: "chat.completion", created, model, choices, usage };
}
