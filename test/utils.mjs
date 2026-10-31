import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { styleText } from "util";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadEnv() {
	const path = join(__dirname, "..", ".env");
	config({ path, quiet: true });
}

export function getConfig() {
	loadEnv();
	const baseUrl = process.env.BASE_URL;
	const key = process.env.API_KEY;
	if (!baseUrl) throw new Error("Fill the BASE_URL in your .env file");
	if (!key) throw new Error("Fill the API_KEY in your .env file");
	return {
		baseUrl,
		model: "gemini-3.5-flash",
		key
	};
}

export function log(title, status) {
	if (status) {
		const ok = status >= 200 && status < 300;
		console.log(styleText("cyan", `${title}`), styleText(ok ? "green" : "red", `${status}`));
	} else {
		console.log(styleText("gray", `${title}`));
	}
}

export async function req(path, opts = {}) {
	const { baseUrl, key } = getConfig();
	const res = await fetch(`${baseUrl}${path}`, {
		...opts,
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
			...(opts.headers || {})
		}
	});
	return res;
}
