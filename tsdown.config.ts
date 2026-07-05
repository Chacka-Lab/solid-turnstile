import { defineConfig } from 'tsdown';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  dts: true,
  entry: ['./src/validate.ts', './src/component.tsx'],
  target: 'es2020',
  plugins: [
    babel({
      presets: [['babel-preset-solid', { generate: 'dom' }]],
    }),
  ],
});
