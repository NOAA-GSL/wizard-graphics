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
    // maplibre-gl v6 resolves its worker via `import.meta.url`; pre-bundling into
    // .vite/deps breaks that lookup and no vector tiles ever get parsed.
    optimizeDeps: {
        exclude: ['maplibre-gl'],
    },
    define: {
        'process.env.mapToken': JSON.stringify(process.env.mapToken),
    },
});
