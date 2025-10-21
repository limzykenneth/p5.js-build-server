import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{Bindings: Env}>();

app.use(cors());

app.get('/:path{.+}', async (c) => {
	let path = c.req.param("path");
	let requestedModules = ['core', 'accessibility', 'friendlyErrors'];
	if(path.includes("p5.custom.js")){
		if(c.req.queries().modules) requestedModules.push(...c.req.queries().modules[0].split(","))
		requestedModules = [...new Set(requestedModules)];
		requestedModules.sort();
		path += `(${requestedModules.join("__")})`;
	}

	const cache = caches.default;
	let response = await cache.match(c.req.url);
	let contentHash: ArrayBuffer;

	if(!response){
		// Data not in worker cache
		console.log("Missed cache");
		const data = await c.env.BUILDS.get(path);

		if(data){
			// Data cached in R2
			contentHash = data.checksums.sha256;
			c.header("Content-Type", "text/javascript; charset=utf-8");
			response = c.body(await data.text());
		}else{
			// Data not cached anywhere, generate from origin server
			let res: Response;
			if(c.env.DEV === "true"){
				const originalUrl = new URL(c.req.raw.url);
				const targetUrl = new URL(c.env.BUILD_SERVER);
				originalUrl.host = targetUrl.host;
				const req = new Request(originalUrl, c.req.raw);
				res = await fetch(req);
			}else{
				res = await fetch(c.req.raw);
			}

			// Return value from origin server
			if(res.ok){
				const body = await res.text();
				contentHash = await digestMessage(body);
				c.executionCtx.waitUntil(c.env.BUILDS.put(path, body, {
					sha256: contentHash
				}));
				c.header("Content-Type", "text/javascript; charset=utf-8");
				response = c.body(body);
			}else{
				// Error retrieving data, return right away
				return res;
			}
		}

		response.headers.set("Cache-Control", "public, max-age=31536000");
		response.headers.set("ETag", bufferToBase64(contentHash));
		c.executionCtx.waitUntil(cache.put(c.req.url, response.clone()));
	}

	c.header("Content-Type", "text/javascript; charset=utf-8");
	if(contentHash) c.header("ETag", bufferToBase64(contentHash));
	c.header("Cache-Control", "public, max-age=31536000");

	return response;
});

async function digestMessage(message: string) {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
  return hashBuffer;
}

function bufferToBase64(buf: ArrayBuffer){
	const hashArray = Array.from(new Uint8Array(buf)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => String.fromCharCode(b))
    .join(""); // convert bytes to hex string
  return btoa(hashHex);
}

export default app;
