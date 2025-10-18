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
		c.header("Content-Type", "text/javascript; charset=utf-8");
		return c.body(await data.text());
	}else{
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

		if(res.ok){
			const body = await res.text();
			await c.env.BUILDS.put(path, body);
			c.header("Content-Type", "text/javascript");
			return c.body(body);
		}else{
			return res;
		}
	}
});

export default app;
