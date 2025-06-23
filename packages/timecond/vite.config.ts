import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@knz/timecond',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [], // add external dependencies here if needed
    },
    emptyOutDir: true,
  },
});
