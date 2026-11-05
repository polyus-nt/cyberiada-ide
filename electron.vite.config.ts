import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import svgr from 'vite-plugin-svgr';

import { resolve } from 'path';

export default defineConfig({
  main: {
    // The Markdown parser is ESM; bundle it into the CommonJS main process.
    plugins: [externalizeDepsPlugin({ exclude: ['mdast-util-from-markdown'] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [react(), svgr()],
  },
});
