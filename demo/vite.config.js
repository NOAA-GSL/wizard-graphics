import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const demoRoot = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
    base: '/wizard-graphics/',
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
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(demoRoot, 'index.html'),
                basemap: path.resolve(demoRoot, 'examples/basemap/index.html'),
                globeView: path.resolve(demoRoot, 'examples/globeView/index.html'),
                legends: path.resolve(demoRoot, 'examples/legends/index.html'),
                multiPanel: path.resolve(demoRoot, 'examples/multiPanel/index.html'),
                otherLayers: path.resolve(demoRoot, 'examples/otherLayers/index.html'),
                terrain: path.resolve(demoRoot, 'examples/terrain/index.html'),
            },
        },
    },
    define: {
        'process.env.mapToken': JSON.stringify(process.env.mapToken),
    },
});
