import { Hono } from "hono";
import { cors } from "hono/cors";
import { describeRoute, openAPIRouteHandler, validator } from "hono-openapi";
import z from "zod";
import { Scalar } from "@scalar/hono-api-reference";
import semver from "semver";

const app = new Hono<{ Bindings: Env }>();

app.use(cors());

app.get(
  "/openapi.json",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "p5.js Build Server",
        version: "1.0.0",
        description: "On demand custom build for p5.js"
      }
    }
  })
);

app.get("/scalar", Scalar({ url: "/openapi.json" }));

app.get("/versions", async (c) => {
  return c.json([]);
});

app.get("/modules", async (c) => {
  return c.json([]);
});

/**
 * Main route to get custom built p5.js versions.
 */
app.get(
  "/:version/:mod",
  describeRoute({
    responses: {
      200: {
        description: "Returns the built custom p5.js library as requested in the URL.",
        content: {
          "text/javascript": {
            schema: {
              type: "string"
            }
          }
        }
      }
    }
  }),
  validator(
    "param",
    z.object({
      version: z
        .string()
        .refine(
          (val) => {
            return semver.gte(val, "2.0.1");
          },
          {
            error: "Must be valid semver >=2.0.1"
          }
        )
        .meta({
          description: "Valid semver of p5.js fulfulling >=2.0.1",
          example: "2.2.3"
        }),
      mod: z
        .union([
          z.literal(["p5.js", "p5.min.js", "p5.custom.js"]),
          z.templateLiteral(["p5.", z.string(), ".js"])
        ])
        .meta({
          description: "Specific p5.js module or build."
        })
    })
  ),
  validator(
    "query",
    z.object({
      modules: z.string().optional().meta({
        description:
          "Used with `mod` path of `p5.custom.js` and is a comma separated list of modules to include in the custom build",
        example: "shape,type,math"
      })
    })
  ),
  async (c) => {
    let { version, mod } = c.req.param();
    let path = `${version}/${mod}`;
    let requestedModules = ["core", "accessibility", "friendlyErrors"];
    if (mod === "p5.custom.js") {
      if (c.req.queries().modules) requestedModules.push(...c.req.queries().modules[0].split(","));
      requestedModules = [...new Set(requestedModules)];
      requestedModules.sort();
      path += `(${requestedModules.join("__")})`;
    }

    const cache = caches.default;
    let response = await cache.match(c.req.url);
    if (response) return response;

    let contentHash: ArrayBuffer;

    if (!response) {
      // Data not in worker cache
      console.log("Missed cache");
      const data = await c.env.BUILDS.get(path);

      if (data) {
        // Data cached in R2
        contentHash = data.checksums.sha256;
        c.header("Content-Type", "text/javascript; charset=utf-8");
        response = c.body(await data.text());
      } else {
        // Data not cached anywhere, generate from origin server
        let res: Response;
        if (c.env.DEV === "true") {
          const originalUrl = new URL(c.req.raw.url);
          const targetUrl = new URL(c.env.BUILD_SERVER);
          originalUrl.host = targetUrl.host;
          const req = new Request(originalUrl, c.req.raw);
          res = await fetch(req);
        } else {
          res = await fetch(c.req.raw);
        }

        // Return value from origin server
        if (res.ok) {
          const body = await res.text();
          contentHash = await digestMessage(body);
          c.executionCtx.waitUntil(
            c.env.BUILDS.put(path, body, {
              sha256: contentHash
            })
          );
          c.header("Content-Type", "text/javascript; charset=utf-8");
          response = c.body(body);
        } else {
          // Error retrieving data, return right away
          return res;
        }
      }

      response.headers.set("Cache-Control", "public, max-age=31536000");
      response.headers.set("ETag", bufferToBase64(contentHash));
      c.executionCtx.waitUntil(cache.put(c.req.url, response.clone()));
    }

    return response;
  }
);

async function digestMessage(message: string) {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
  return hashBuffer;
}

function bufferToBase64(buf: ArrayBuffer) {
  const hashArray = Array.from(new Uint8Array(buf)); // convert buffer to byte array
  const hashHex = hashArray.map((b) => String.fromCharCode(b)).join(""); // convert bytes to hex string
  return btoa(hashHex);
}

export default app;
