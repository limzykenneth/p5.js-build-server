import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { rolldown } from 'rolldown';
import { match, P } from 'ts-pattern';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = new Hono();

app.get('/:version/:mod{^p5.(?:([a-zA-Z0-9_-]+)\.)?js$}', async (c) => {
  const modRegex = /^p5.(?:([a-zA-Z0-9_-]+)\.)?js$/;
  const { version, mod } = c.req.param();
  const moduleType = modRegex.exec(mod)?.[1];
  const coreModules = ['core', 'accessibility', 'friendlyErrors'];
  const nodeModulesPath = path.resolve( 
    path.join(
      fileURLToPath(import.meta.resolve(`p5-${version}`)), 
      '../..'
    )
  );

  const { default: pjson } = await import(
    path.join(nodeModulesPath, `./package.json`), 
    { with: { type: 'json' } }
  );
  const allModules = Object.keys(pjson.exports).map((key) => {
    const reg = /\.\/?([a-zA-Z0-9_-]+)/;
    return reg.exec(key)?.[1];
  }).filter((m) => m);

  return match<string|undefined>(moduleType)
    .with(undefined, async () => {
      const bundle = await rolldown({
        input: path.join(nodeModulesPath, `./dist/app.js`),
        treeshake: {
          moduleSideEffects: false
        }
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
        input: path.join(nodeModulesPath, `./dist/app.js`)
      });
      const { output } = await bundle.generate({
        format: 'iife',
        name: 'p5',
        minify: true
      });

      return c.text(output[0].code);
    })
    .with(P.when((i) => allModules.includes(i)), async () => {
      const input = path.normalize(
        path.join(nodeModulesPath, pjson.exports[`./${moduleType}`])
      );
      const bundle = await rolldown({
        input,
        treeshake: {
          moduleSideEffects: false
        }
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
        return path.normalize(
          path.join(nodeModulesPath, pjson.exports[`./${mod}`])
        );
      });

      const query = c.req.query('modules');
      let additionalModules: string[];
      if(query){
        additionalModules = query.split(',').map((mod) => {
          return path.normalize(
            path.join(nodeModulesPath, pjson.exports[`./${mod}`])
          );
        });
      }

      const input = [
        ...defaultModules,
        path.join(nodeModulesPath, `./dist/core/init.js`)
      ];
      if(additionalModules) input.push(...additionalModules);

      const { default: multi } = await import('@rollup/plugin-multi-entry');
      const bundle = await rolldown({
        input,
        treeshake: {
          moduleSideEffects: false
        },
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
