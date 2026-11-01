export const config = {
	getGeminiApiKey(): string | undefined {
		return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
	},
};
