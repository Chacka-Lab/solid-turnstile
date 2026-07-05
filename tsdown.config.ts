import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  entry: ['./src/validate.ts', './src/component.tsx'],
  target: 'es2020',
});
