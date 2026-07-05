import { defineConfig } from 'tsdown';
import babel from '@rolldown/plugin-babel';

export default defineConfig([
  // DOM build — default for browser/bundler environments.
  {
    dts: true,
    entry: ['./src/validate.ts', './src/component.tsx'],
    target: 'es2020',
    plugins: [
      babel({
        presets: [['solid', { generate: 'dom', hydratable: true }]],
      }),
    ],
  },
  // SSR build — served under the `node` and `worker` export conditions.
  // babel-preset-solid's `ssr` codegen never emits `use` from solid-js/web,
  // which only exists in the DOM runtime.
  {
    dts: false,
    entry: ['./src/component.tsx'],
    outDir: 'dist/server',
    target: 'es2020',
    plugins: [
      babel({
        presets: [['solid', { generate: 'ssr', hydratable: true }]],
      }),
    ],
  },
]);
