import { defineConfig } from 'vite';
import { chubolAssets } from './scripts/viteChubolAssets.ts';

export default defineConfig({
  plugins: [chubolAssets()],
  base: './',
  server: { open: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
