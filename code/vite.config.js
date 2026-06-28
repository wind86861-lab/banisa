
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                entryFileNames: 'assets/[name]-[hash]-v10.js',
                chunkFileNames: 'assets/[name]-[hash]-v10.js',
                assetFileNames: 'assets/[name]-[hash]-v10[extname]',
                // Earlier we ran a granular manualChunks split (react /
                // router / query / motion / icons / qr / vendor). It cut
                // the entry payload but produced
                //   "Cannot read properties of undefined (reading
                //    'createContext')"
                // in production: react-leaflet (which uses
                // React.createContext via CJS interop) ended up in the
                // generic 'vendor' chunk while React itself lived in a
                // separate chunk, and the evaluation order broke the
                // interop default. Splitting React off from anything
                // that imports it is what tripped us up. Letting Vite
                // chunk naturally avoids the foot-gun; the entry payload
                // is bigger but the site actually loads. Revisit with
                // route-level dynamic import() instead of vendor splits.
            },
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
});
