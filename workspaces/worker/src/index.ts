import { Hono } from 'hono';

const app = new Hono<{Bindings: Env}>();

app.get('/:path{.+}', async (c) => {
	let path = c.req.param("path");
	let requestedModules = ['core', 'accessibility', 'friendlyErrors'];
	if(path.includes("p5.custom.js")){
		if(c.req.queries().modules) requestedModules.push(...c.req.queries().modules[0].split(","))
		requestedModules = [...new Set(requestedModules)];
		requestedModules.sort();
		path += `(${requestedModules.join("__")})`;
	}
	const data = await c.env.BUILDS.get(path);

	if(data){
		c.header("Content-Type", "text/javascript");
		return c.text(await data.text());
	}else{
		if(c.env.DEV === "true"){
			const originalUrl = new URL(c.req.raw.url);
			const targetUrl = new URL(c.env.BUILD_SERVER);
			originalUrl.host = targetUrl.host;
			const req = new Request(originalUrl, c.req.raw);
			const res = await fetch(req);
			
			if(res.ok){
				const body = await res.text();
				await c.env.BUILDS.put(path, body);
				c.header("Content-Type", "text/javascript");
				return c.text(body);
			}else{
				return res;
			}
		}else{
			return fetch(c.req.raw);
		}
	}
});

export default app;