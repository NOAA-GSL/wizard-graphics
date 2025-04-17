import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'desi-graphics': path.resolve('./src'),
            'demo-data': path.resolve('./examples/demo-data'),
        },
    },
    define: {
        'process.env.mapToken': JSON.stringify(process.env.mapToken),
    },
    build: {
        // Specifies that the output of the build will be a library.
        lib: {
            // Defines the entry point for the library build. It resolves
            // to src/index.ts,indicating that the library starts from this file.
            entry: path.resolve(__dirname, 'src/index.js'),
            name: 'desi-graphics',
            // A function that generates the output file
            // name for different formats during the build
            fileName: (format) => `desi-graphics.${format}.js`,
        },
        rollupOptions: {
            // put all peer dependencies here
            external: [
                'react',
                'react-dom',
                /^@deck.gl.*/,
                /^@luma.gl.*/,
                /^@math.gl.*/,
                'maplibre-gl',
                'd3',
                'lodash',
                /^react-map-gl.*/,
                'proj4',
            ],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
        // Generates sourcemaps for the built files,
        // aiding in debugging.
        sourcemap: true,
        // Clears the output directory before building.
        emptyOutDir: true,
    },
});
