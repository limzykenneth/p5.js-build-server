import { rolldown } from 'rolldown';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { match, P } from 'ts-pattern';
import virtual from '@rollup/plugin-virtual';
import path from 'node:path';
import multi from '@rollup/plugin-multi-entry';

const app = new Hono();

app.get('/:version/:mod{^p5.(?:([a-zA-Z0-9_-]+)\.)?js$}', async (c) => {
  const modRegex = /^p5.(?:([a-zA-Z0-9_-]+)\.)?js$/;
  const { version, mod } = c.req.param();
  const moduleType = modRegex.exec(mod)?.[1];
  const coreModules = ['core', 'accessibility', 'friendlyErrors'];

  const { default: pjson } = await import(`./node_modules/p5-${version}/package.json`, { with: { type: 'json' } });
  const allModules = Object.keys(pjson.exports).map((key) => {
    const reg = /\.\/?([a-zA-Z0-9_-]+)/;
    return reg.exec(key)?.[1];
  }).filter((m) => m);

  return match<string|undefined>(moduleType)
    .with(undefined, async () => {
      const bundle = await rolldown({
        input: `./node_modules/p5-${version}/dist/app.js`
      });
      const { output } = await bundle.generate({
        format: 'iife',
        name: 'p5',
        minify: 'dce-only'
      });

      return c.text(output[0].code);
    })
    .with('min', async () => {
      const bundle = await rolldown({
        input: `./node_modules/p5-${version}/dist/app.js`
      });
      const { output } = await bundle.generate({
        format: 'iife',
        name: 'p5',
        minify: true
      });

      return c.text(output[0].code);
    })
    .with(P.when((i) => allModules.includes(i)), async () => {
      const input = path.normalize(`./node_modules/p5-${version}/${pjson.exports[`./${moduleType}`]}`);
      const bundle = await rolldown({
        input
      });
      const { output } = await bundle.generate({
        format: 'iife',
        name: moduleType === 'core' ? 'p5' : undefined,
        minify: true
      });

      return c.text(output[0].code);
    })
    .with('custom', async () => {
      const defaultModules = coreModules.map((mod) => {
        return path.normalize(`./node_modules/p5-${version}/${pjson.exports[`./${mod}`]}`);
      });

      const query = c.req.query('modules');
      let additionalModules: string[];
      if(query){
        additionalModules = query.split(',').map((mod) => {
          return path.normalize(`./node_modules/p5-${version}/${pjson.exports[`./${mod}`]}`);
        });
      }

      const input = [
        ...defaultModules,
        `./node_modules/p5-${version}/dist/core/init.js`
      ];
      if(additionalModules) input.push(...additionalModules);

      const bundle = await rolldown({
        input,
        plugins: [
          multi()
        ]
      });
      const { output } = await bundle.generate({
        format: 'iife',
        name: 'p5',
        minify: true
      });

      return c.text(output[0].code);
    })
    .otherwise(() => {
      return c.text('Not Found', 404);
    });
});

serve({
  fetch: app.fetch,
  port: 8080
});
