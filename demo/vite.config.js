import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'demo-data': path.resolve('./examples/demo-data'),
        },
    },
    define: {
        'process.env.mapToken': JSON.stringify(process.env.mapToken),
    },
});
