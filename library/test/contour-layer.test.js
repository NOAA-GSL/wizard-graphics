import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { isoline } from '../src/layers/contourLayer/raster-marching-squares.js';

const require = createRequire(import.meta.url);
const extractionCalls = [];

function extractLines(algorithm, lonlatGrid, values, levels, shape) {
    extractionCalls.push({ algorithm, lonlatGrid, values, levels, shape });
    return {
        type: 'FeatureCollection',
        features: levels.map((value) => ({
            type: 'Feature',
            geometry: {
                type: 'MultiLineString',
                coordinates: [
                    [
                        [-100, 30],
                        [-99, 31],
                    ],
                ],
            },
            properties: [{ value }],
        })),
    };
}

class Sublayer {
    constructor(...props) {
        this.props = Object.assign({}, ...props);
    }
}

const filename = new URL('../src/layers/contourLayer/contourLayer.js', import.meta.url);
const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
    },
});
const loadedModule = { exports: {} };
const resolveImport = (name) => {
    if (name === '@deck.gl/core') return require(name);
    if (name.endsWith('/graphicsUtilities')) {
        return { string_to_rgb: (color) => color.match(/\d+/g).map(Number) };
    }
    if (name === './contourLabels') return { ContourLabels: Sublayer };
    if (name.endsWith('/WizardPathLayer')) return Sublayer;
    if (name.endsWith('/legendHelperFunctions')) {
        return {
            getColors: (levels, colors) => () => (Array.isArray(colors) ? colors[0] : colors),
        };
    }
    if (name === './triangleContours') {
        return (...args) => extractLines('marchingTriangles', ...args);
    }
    if (name === './raster-marching-squares') {
        return {
            isolines: (values, grid, transform, levels, shape) =>
                extractLines('marchingSquares', grid, values, levels, shape),
        };
    }
    throw new Error(`Unexpected import: ${name}`);
};
vm.runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, {
    filename: filename.pathname,
})(resolveImport, loadedModule, loadedModule.exports);
const ContourLayer = loadedModule.exports.default;

function makeLayer() {
    extractionCalls.length = 0;
    const layer = {
        props: {
            ...ContourLayer.defaultProps,
            id: 'contour-test',
            data: new Float32Array([0, 1, 2, 3]),
            lonlatGrid: [
                [-100, 30],
                [-99, 30],
                [-100, 31],
                [-99, 31],
            ],
            shape: [2, 2],
            algorithm: 'marchingSquares',
            contourLevels: [1, 2],
            colorLevels: [1, 2],
            colors: ['rgb(255, 0, 0)'],
            colorType: 'scaleThreshold',
        },
        setState(values) {
            Object.assign(this.state, values);
        },
    };
    ContourLayer.prototype.initializeState.call(layer);
    const update = (props = {}, changeFlags = {}) => {
        layer.props = { ...layer.props, ...props };
        ContourLayer.prototype.updateState.call(layer, { props: layer.props, changeFlags });
    };
    update();
    return { layer, update };
}

test('labels, width, readout, and equivalent option arrays reuse lines and styled paths', () => {
    const { layer, update } = makeLayer();
    const { lines, isoLines } = layer.state;
    update({ labels: { enabled: true, getSize: 14 } });
    update({ getWidth: 20, widthMinPixels: 3, readout: [] });
    update({
        shape: [2, 2],
        contourLevels: [1, 2],
        colorLevels: [1, 2],
        colors: ['rgb(255, 0, 0)'],
    });
    assert.equal(extractionCalls.length, 1);
    assert.equal(layer.state.lines, lines);
    assert.equal(layer.state.isoLines, isoLines);
    const [paths, labels] = ContourLayer.prototype.renderLayers.call(layer);
    assert.equal(paths.props.data, isoLines);
    assert.equal(paths.props.getWidth, 20);
    assert.equal(labels.props.lines, lines);
    assert.equal(labels.props.getSize, 14);
});

test('colors, color scales, and elevation update styled paths without extracting contours', () => {
    const { layer, update } = makeLayer();
    const { lines, isoLines } = layer.state;
    update({ colors: 'rgb(0, 0, 255)' });
    assert.notEqual(layer.state.isoLines, isoLines);
    assert.deepEqual(layer.state.isoLines[0].color, [0, 0, 255]);
    const bluePaths = layer.state.isoLines;
    update({ colorLevels: [0, 3], colorType: 'scaleLinear' });
    assert.notEqual(layer.state.isoLines, bluePaths);
    update({ elevation: 120 });
    assert.equal(layer.state.isoLines[0].polygon[0][2], 120);
    assert.equal(layer.state.lines, lines);
    assert.equal(extractionCalls.length, 1);
});

test('data, grid, shape, algorithm, and contour levels invalidate generated lines', () => {
    const { layer, update } = makeLayer();
    for (const props of [
        { data: new Float32Array([3, 2, 1, 0]) },
        {
            lonlatGrid: layer.props.lonlatGrid.map(([longitude, latitude]) => [
                longitude + 1,
                latitude,
            ]),
        },
        { shape: [3, 2] },
        { algorithm: 'marchingTriangles' },
        { contourLevels: [0.5, 1.5] },
    ]) {
        const previous = layer.state.lines;
        update(props);
        assert.notEqual(layer.state.lines, previous);
    }
    assert.equal(extractionCalls.length, 6);
    const previous = layer.state.lines;
    layer.props.data[0] += 1;
    update({}, { dataChanged: true });
    assert.notEqual(layer.state.lines, previous);
    assert.equal(extractionCalls.length, 7);
});

test('projection grid fallback and default colorLevels invalidate contours correctly', () => {
    const { layer, update } = makeLayer();
    const initial = layer.state.lines;
    update({
        lonlatGrid: undefined,
        projection: { lonlatGrid: layer.props.lonlatGrid },
        contourLevels: undefined,
    });
    assert.equal(layer.state.lines, initial);
    const previous = layer.state.lines;
    update({ colorLevels: [0, 3] });
    assert.notEqual(layer.state.lines, previous);
    update({ projection: { lonlatGrid: layer.props.projection.lonlatGrid.slice() } });
    assert.equal(extractionCalls.length, 3);
});

test('precomputed lines bypass extraction and replacing or removing them updates geometry', () => {
    const { layer, update } = makeLayer();
    const supplied = structuredClone(layer.state.lines);
    update({ lines: supplied });
    update({ data: new Float32Array(4), algorithm: 'marchingTriangles' }, { dataChanged: true });
    assert.equal(layer.state.lines, supplied);
    assert.equal(extractionCalls.length, 1);
    const replacement = structuredClone(supplied);
    update({ lines: replacement });
    assert.equal(layer.state.lines, replacement);
    update({ lines: undefined });
    assert.equal(extractionCalls.length, 2);
    assert.notEqual(layer.state.lines, replacement);
});

test('linear-time path merging preserves legacy marching-squares coordinates', async () => {
    const source = fs.readFileSync(
        new URL('../src/layers/contourLayer/raster-marching-squares.js', import.meta.url),
        'utf8',
    );
    const merge = 'paths[k] = p.path.slice(0, -1).concat(paths[k]);';
    assert.ok(source.includes(merge));
    const legacySource = source.replace(
        merge,
        'for (let pointIndex = p.path.length - 2; pointIndex >= 0; --pointIndex) { paths[k].unshift(p.path[pointIndex]); }',
    );
    const legacy = await import(
        `data:text/javascript;base64,${Buffer.from(legacySource).toString('base64')}`
    );
    for (const [rows, cols] of [
        [2, 2],
        [17, 21],
        [128, 160],
    ]) {
        const dims = [rows, cols];
        for (const field of [
            (row, col) => Math.sin(col / 3) + Math.cos(row / 5),
            (row, col) => ((row + col) % 2 === 0 ? -1 : 1),
        ]) {
            const values = Float32Array.from({ length: rows * cols }, (_, index) =>
                field(Math.floor(index / cols), index % cols),
            );
            for (const level of [-1, -0.5, 0, 0.5, 1]) {
                assert.deepEqual(isoline(values, level, dims), legacy.isoline(values, level, dims));
            }
            values[Math.floor(values.length / 2)] = NaN;
            assert.deepEqual(isoline(values, 0, dims), legacy.isoline(values, 0, dims));
        }
    }
});
