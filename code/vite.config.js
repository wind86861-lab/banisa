
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
                // Pull heavyweight third-party libs into their own chunks so
                // the first JS payload doesn't have to ship React + Router +
                // icons + tanstack + html5-qrcode all in one ~3.5MB file.
                // Browser cache also wins — these chunks only invalidate
                // when the library itself changes, not when our app code does.
                manualChunks: (id) => {
                    if (!id.includes('node_modules')) return undefined;
                    if (id.includes('react-router') || id.includes('@remix-run/router')) return 'router';
                    if (id.includes('react-dom') || id.includes('/react/')) return 'react';
                    if (id.includes('@tanstack/react-query')) return 'query';
                    if (id.includes('lucide-react')) return 'icons';
                    if (id.includes('html5-qrcode')) return 'qr';
                    if (id.includes('framer-motion')) return 'motion';
                    if (id.includes('axios')) return 'axios';
                    return 'vendor';
                },
            },
        },
        // The first chunk used to break this warning by itself; with the
        // split above each chunk is well under it, but bump the threshold
        // so CI noise stays in line with what we actually care about.
        chunkSizeWarningLimit: 800,
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
