import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
    root: path.resolve(__dirname, 'src/ui'),
    build: {
        outDir: path.resolve(__dirname, '.vite/renderer/main_window'),
        emptyOutDir: true,
    },
});
