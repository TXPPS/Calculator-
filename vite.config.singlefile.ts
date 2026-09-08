import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Produces one fully self-contained dist-single/index.html (JS/CSS inlined,
 * no external requests) that can be opened directly as a local file or
 * hosted anywhere, so the app can be carried between devices without a
 * build step or server. The normal vite.config.ts (dev server + tests)
 * is untouched.
 */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
