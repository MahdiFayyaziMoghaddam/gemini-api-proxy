const ALIAS: Record<string, string> = {
	"gpt-4o": "gemini-2.5-flash",
	"gpt-4o-mini": "gemini-2.5-flash-lite",
	"gpt-4-turbo": "gemini-2.5-flash",
	"gpt-4": "gemini-2.5-pro",
	"gpt-3.5-turbo": "gemini-2.5-flash",
	"o1": "gemini-2.5-pro",
	"o1-mini": "gemini-2.5-flash",
	"o1-preview": "gemini-2.5-pro",
	"o3": "gemini-2.5-pro",
	"o3-mini": "gemini-2.5-flash",
};

// Returns the full Google resource name, e.g. "models/gemini-2.5-flash".
export function normalizeModel(model: string | undefined | null): string {
	if (!model) return "models/gemini-2.5-flash";
	if (ALIAS[model]) return `models/${ALIAS[model]}`;
	if (model.startsWith("models/") || model.startsWith("tunedModels/")) return model;
	return `models/${model}`;
}

// Strips the resource prefix for the OpenAI "model" field.
export function bareModelId(resource: string): string {
	return resource.startsWith("models/") ? resource.slice("models/".length) : resource;
}
