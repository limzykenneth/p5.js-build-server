# p5.js Custom Build Server

This project provides the frontend and backend required to provide on demand access to individual p5.js modules and custom builds.

## Setup
There are two different parts to this project organized as workspaces within the `workspaces` folder:
* `server` - This is a Node.js project that is responsible for building the individual modules and the custom build. We'll call this the "build server" below.
* `worker` - This is a [Cloudflare Workers](https://workers.cloudflare.com/) project that serves as the proxy and cache layer of the Node.js project. It also serves the frontend presented to the user to generate links to the library. We'll call this the "worker" below.

Deployment is automated with the respective GitHub apps of Cloudflare Workers and Google Cloud Build.

### Build server
The build server can be deployed as a regular Node.js project but is currently set up to deploy to [Google Run functions](https://cloud.google.com/functions), the ideal condition is that the build server is called directly very rarely as each version and variation of the library only needs to be built once and once built, it can be cached without every needing to be built again, with requests based billing this should occur little to no cost at all. The strategy to achieve this is documented below in the worker section.

The server itself contains a single route matching `/:version/p5.[type?].js`. On GET request, the route will determine which module to build/include in the build based on the URL. The build uses [Rolldown](https://rolldown.rs/)'s JS API and directly reads entry files from the `node_modules` folder to create the built bundle. All supported versions of p5.js are included as project dependencies, which serves to have all necessary files and dependencies available on request while deduping shared files across versions.

A typical request should take about 2-4 seconds, while this is quite fast for running what is essentially a full build of the p5.js library, it is quite slow for typical web request. A cache layer is thus needed to avoid unnecessary calls to this server.

### Worker
The worker is deployed to Cloudflare workers. The backend code is stored in `worker/src` folder while the static site's frontend code is stored in `worker/frontend`. The backend is a [Hono](https://hono.dev/) based app that accepts GET requests to the base route. The worker is deployed as a fronted proxy to the build server, meaning that while the build server and worker are both deployed to the same hostname, Cloudflare routing means that the worker will get the request first and only forward it onto the build server if necessary. 

Upon receiving a GET request for a build of the library, the worker will look into local cache for a recent request to the same URL and serve that directly if it exist. Next if the cache missed, the worker will generate a static identifying string that uniquely identifies the requested library version and variation. The unique identifier will then be used to look up a built file in the attached [R2 storage](https://www.cloudflare.com/developer-platform/products/r2/) and if it exist, it will cache the data under the request URL and return the file. If the cache also misses on the R2 storage, it means this file has not been previously requested, at this point the worker will forward the request to the build server. Upon the build server returning the built file, the content will now be cached in R2 and local cache while also returned to the user.

If the request successfully hits either of the cache layers, the request should return in under 100ms depending on local latency. If the cache all missed, the 2-4 seconds response time will apply but all subsequent requests should all hit cache.

## Caveats
* By design there is no way to clear cache, once the library is built it should always be served from cache. This avoids unnecessarily hitting the build server. If a manual cache purge is desired, the Cloudflare R2 storage can be selectively purged manually.
* The built library is not guaranteed to be static. While once built the built file persists, the included dependency version may differ between different variation of the library and the official library release with the usual CDN links. ie. Version 2.2.2 of `p5.min.js` requested from here is not guaranteed to be identical to the one requested from JSDelivr (the library functionality should be the same but both files will have different hash).

## Future work
Once there is more clarity and stability to run Rolldown in Cloudflare Workers directly, it would be nice to bypass the need to have a separate Node.js server acting as the build server.

The frontend can be further developed to provide JSDelivr and/or esm.sh links.

Some kind of client library to aid in building relevant URL for different modules would be useful as well.