import { getConfig, log, req } from "./utils.mjs";

const { model } = getConfig();

log("Try GET /v1/models");
let res = await req(`/v1/models`);
log("Status: ", res.status);
console.log();

log("Try GET /v1/models/" + model);
res = await req(`/v1/models/${encodeURIComponent(model)}`);
log("Status: ", res.status);
console.log();

log("Try POST /v1/chat/completions");
res = await req(`/v1/chat/completions`, {
	method: "POST",
	body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }] })
});
log("Status: ", res.status);
console.log();
