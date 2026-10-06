import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { isoline } from '../src/layers/contourLayer/raster-marching-squares.js';
import {
    createContourMesh,
    normalizeLevels,
    placeLabelCandidates,
    sampleLabelCandidates,
    updateContourValues,
} from '../src/layers/gpuContourLayer/contourMesh.js';

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

test('GPU contour label crossings use the same raw scalar triangle field', () => {
    const points = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
    ];
    const data = Float32Array.from(points, ([longitude, latitude]) => longitude + 2 * latitude);
    for (const mode of ['quadkey', 'unstructured']) {
        const mesh = createContourMesh(points, [2, 2], mode);
        const field = updateContourValues(mesh, data);
        assert.equal(field.values.length, mesh.positions.length / 3);
        assert.equal(field.indices, mesh.triangleIndices);
        const candidates = sampleLabelCandidates(mesh, field, [0.5, 1.5, 2.5]);
        assert.ok(candidates.length > 0);
        for (const candidate of candidates) {
            assert.ok(
                Math.abs(candidate.position[0] + 2 * candidate.position[1] - candidate.value) <
                    1e-6,
            );
        }
    }
});

test('GPU contour masks remove triangles with missing values instead of interpolating across gaps', () => {
    const mesh = createContourMesh(
        [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
        ],
        [2, 2],
    );
    const field = updateContourValues(mesh, [0, NaN, 2, 3]);
    for (const index of field.indices) assert.ok(Number.isFinite(field.values[index]));
    assert.ok(field.indices.length < mesh.triangleIndices.length);
    const restored = updateContourValues(mesh, [0, 1, 2, 3]);
    assert.equal(restored.indices, mesh.triangleIndices);
});

test('GPU contour candidate work is bounded and levels are sorted and Float32-compatible', () => {
    const points = Array.from({ length: 100 }, (_, index) => [index % 10, Math.floor(index / 10)]);
    const mesh = createContourMesh(points, [10, 10]);
    const field = updateContourValues(
        mesh,
        Float32Array.from(points, ([longitude]) => longitude),
    );
    const levels = normalizeLevels([4.5, NaN, 0.5, 4.5, Infinity, 2.5]);
    assert.deepEqual(levels, [0.5, 2.5, 4.5]);
    assert.ok(sampleLabelCandidates(mesh, field, levels, 5).length <= 5);
    assert.deepEqual(sampleLabelCandidates(mesh, field, levels, 0), []);
    assert.deepEqual(sampleLabelCandidates(mesh, field, []), []);
    assert.throws(() => normalizeLevels(Array.from({ length: 2049 }, (_, index) => index)), /2048/);
    assert.throws(() => createContourMesh(points, [10, 10], 'quadkey-cells'), /Unsupported/);
});

test('GPU label placement declutters shared values and respects visibility and label budget', () => {
    const mesh = createContourMesh(
        [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
        ],
        [2, 2],
    );
    const field = updateContourValues(mesh, [0, 1, 2, 3]);
    const candidates = sampleLabelCandidates(mesh, field, [0.5, 1.5, 2.5]);
    const viewport = {
        width: 500,
        height: 500,
        projectPosition: (position) => position,
        unprojectPosition: (position) => position,
        project: ([longitude, latitude]) => [longitude * 400, latitude * 400, 0.5],
    };
    const labels = placeLabelCandidates(mesh, candidates, viewport, { spacing: 350, maxLabels: 2 });
    assert.ok(labels.length > 0 && labels.length <= 2);
    assert.deepEqual(placeLabelCandidates(mesh, candidates, viewport, { maxLabels: 0 }), []);
    assert.deepEqual(
        placeLabelCandidates(mesh, candidates, { ...viewport, project: () => [-1, -1, 0.5] }),
        [],
    );
    for (const label of labels)
        assert.ok(Math.abs(label.position[0] + 2 * label.position[1] - label.value) < 1e-6);
});

function loadGpuLayer() {
    class MemoryModel {
        constructor(...args) {
            this.topology = args[1].topology;
            this.attributes = {};
            this.shaderInputs = { setProps() {} };
        }
        setAttributes(attributes) {
            Object.assign(this.attributes, attributes);
        }
        setBindings(bindings) {
            this.bindings = bindings;
        }
        setIndexBuffer(buffer) {
            this.indexBuffer = buffer;
        }
        setVertexCount(count) {
            this.vertexCount = count;
        }
        setInstanceCount(count) {
            this.instanceCount = count;
        }
        draw() {
            this.drawnInstanceCount = this.instanceCount;
        }
        destroy() {
            this.destroyed = true;
        }
    }
    const sourceFile = new URL('../src/layers/gpuContourLayer/gpuContourLayer.js', import.meta.url);
    const { outputText: compiled } = ts.transpileModule(fs.readFileSync(sourceFile, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    });
    const module = { exports: {} };
    const imports = (name) => {
        if (name === './contourMesh.js')
            return {
                createContourMesh,
                normalizeLevels,
                placeLabelCandidates,
                sampleLabelCandidates,
                updateContourValues,
            };
        if (name === '@luma.gl/engine') return { Model: MemoryModel };
        if (name === '@luma.gl/core') return require(name);
        if (name === '@deck.gl/layers') return { TextLayer: Sublayer };
        if (name.endsWith('/contourLabels')) return { ContourLabels: { defaultProps: {} } };
        if (name.endsWith('/deckUtilities')) {
            const utilityFile = new URL('../src/utilities/deckUtilities.js', import.meta.url);
            const { outputText: utilityCompiled } = ts.transpileModule(
                fs.readFileSync(utilityFile, 'utf8'),
                {
                    compilerOptions: {
                        module: ts.ModuleKind.CommonJS,
                        target: ts.ScriptTarget.ES2022,
                        esModuleInterop: true,
                    },
                },
            );
            const utilityModule = { exports: {} };
            vm.runInThisContext(`(function(require, module, exports) { ${utilityCompiled}\n})`, {
                filename: utilityFile.pathname,
            })(resolveImport, utilityModule, utilityModule.exports);
            return utilityModule.exports;
        }
        return resolveImport(name);
    };
    vm.runInThisContext(`(function(require, module, exports) { ${compiled}\n})`, {
        filename: sourceFile.pathname,
    })(imports, module, module.exports);
    return module.exports;
}

test('GPU contour triangles without an actual threshold crossing are not rendered', () => {
    const points = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
    ];
    const mesh = createContourMesh(points, [2, 2]);
    assert.equal(updateContourValues(mesh, [65.1, 65.1, 65.3, 65.3], [65]).indices.length, 0);
    assert.equal(updateContourValues(mesh, [65, 65, 65, 65], [65]).indices.length, 0);
    assert.equal(updateContourValues(mesh, [64, 66, 64, 66], []).indices.length, 0);
    const crossing = updateContourValues(mesh, [64, 66, 64, 66], [65]);
    assert.ok(crossing.indices.length > 0);
    for (let offset = 0; offset < crossing.indices.length; offset += 3) {
        const values = Array.from(
            crossing.indices.subarray(offset, offset + 3),
            (index) => crossing.values[index],
        );
        assert.ok(Math.min(...values) <= 65 && Math.max(...values) >= 65);
    }
    assert.equal(crossing.segments.length / 4, crossing.indices.length / 3);
    const levels = normalizeLevels([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const multiple = updateContourValues(mesh, [0, 3, 6, 9], levels);
    assert.ok(multiple.segments.length / 4 > mesh.triangleIndices.length / 3);
    for (let offset = 0; offset < multiple.segments.length; offset += 4) {
        const values = Array.from(
            multiple.segments.subarray(offset, offset + 3),
            (index) => multiple.values[index],
        );
        const level = levels[multiple.segments[offset + 3]];
        assert.ok(Math.min(...values) <= level && Math.max(...values) >= level);
    }
    const { GpuContourLayer } = loadGpuLayer();
    assert.equal(GpuContourLayer.defaultProps.parameters.cullMode, 'back');
});

test('GPU contour scheduling matches inclusive threshold ranges across repeated scalar updates', () => {
    const points = Array.from({ length: 100 }, (_, index) => [index % 10, Math.floor(index / 10)]);
    for (const mode of ['quadkey', 'spherical', 'unstructured']) {
        const mesh = createContourMesh(points, [10, 10], mode);
        mesh.positions[0] = NaN;
        for (const offset of [0, 0.25, -3, 20]) {
            const data = points.map((_, index) => (index % 17 === 0 ? NaN : (index % 7) + offset));
            for (const levels of [undefined, [], normalizeLevels([0, 1, 2, 3, 4, 5, 6])]) {
                const field = updateContourValues(mesh, data, levels);
                const expectedIndices = [];
                const expectedSegments = [];
                for (let index = 0; index < mesh.triangleIndices.length; index += 3) {
                    const triangle = Array.from(mesh.triangleIndices.subarray(index, index + 3));
                    if (
                        !triangle.every(
                            (vertex) =>
                                Number.isFinite(field.values[vertex]) &&
                                Number.isFinite(mesh.positions[vertex * 3]) &&
                                Number.isFinite(mesh.positions[vertex * 3 + 1]),
                        )
                    )
                        continue;
                    const minimum = Math.min(...triangle.map((vertex) => field.values[vertex]));
                    const maximum = Math.max(...triangle.map((vertex) => field.values[vertex]));
                    const eligible = levels?.flatMap((level, levelIndex) =>
                        minimum !== maximum && level >= minimum && level <= maximum
                            ? [levelIndex]
                            : [],
                    );
                    if (eligible && !eligible.length) continue;
                    expectedIndices.push(...triangle);
                    for (const level of eligible || []) expectedSegments.push(...triangle, level);
                }
                assert.deepEqual(Array.from(field.indices), expectedIndices);
                assert.deepEqual(
                    field.segments && Array.from(field.segments),
                    levels && expectedSegments,
                );
            }
        }
    }
});

test('GPU contour updates preserve geometry and palette across data and camera changes', () => {
    const { GpuContourLayer } = loadGpuLayer();
    const { WebMercatorViewport } = require('@deck.gl/core');
    const layer = {
        state: {},
        context: {
            viewport: new WebMercatorViewport({
                width: 800,
                height: 600,
                longitude: 0.5,
                latitude: 0.5,
                zoom: 5,
            }),
        },
        props: {
            ...GpuContourLayer.defaultProps,
            lonlatGrid: [
                [0, 0],
                [1, 0],
                [0, 1],
                [1, 1],
            ],
            shape: [2, 2],
            data: new Float32Array([0, 1, 2, 3]),
            contourLevels: [0.5, 1.5, 2.5],
            colorLevels: [0, 3],
            colors: 'rgb(255, 0, 0)',
            colorType: 'scaleLinear',
            labels: { enabled: true },
        },
        setState(values) {
            Object.assign(this.state, values);
        },
    };
    const update = (props = {}, changeFlags = {}) => {
        layer.props = { ...layer.props, ...props };
        GpuContourLayer.prototype.updateState.call(layer, { props: layer.props, changeFlags });
    };
    update();
    const initial = { ...layer.state };
    update(
        { lineWidth: 3, shape: [2, 2], contourLevels: [2.5, 1.5, 0.5] },
        { viewportChanged: true },
    );
    assert.equal(layer.state.mesh, initial.mesh);
    assert.equal(layer.state.field, initial.field);
    assert.equal(layer.state.table, initial.table);
    assert.equal(layer.state.candidates, initial.candidates);
    update({ data: new Float32Array([3, 2, 1, 0]) });
    assert.equal(layer.state.mesh, initial.mesh);
    assert.notEqual(layer.state.field, initial.field);
    assert.equal(layer.state.table, initial.table);
    update({ colors: 'rgb(0, 0, 255)' });
    assert.notEqual(layer.state.table, initial.table);
    update({ labels: { enabled: false } });
    assert.deepEqual(layer.state.labels, []);
    assert.equal(layer.state.candidates, undefined);
    const previousMesh = layer.state.mesh;
    update({ contourLevels: [10] });
    assert.equal(layer.state.mesh, previousMesh);
    assert.equal(layer.state.field.indices.length, 0);
    assert.equal(layer.state.field.segments.length, 0);
    update({ contourLevels: [0.5, 1.5, 2.5] });
    assert.equal(layer.state.mesh, previousMesh);
    assert.ok(layer.state.field.segments.length > 0);
    update({ elevation: 100 });
    assert.notEqual(layer.state.mesh, initial.mesh);
});

test('GPU surface reuses compatible buffers and destroys all owned resources', () => {
    const { ContourSurface } = loadGpuLayer();
    const resources = [];
    const device = {
        type: 'webgl',
        createBuffer(props) {
            assert.ok(props.data instanceof Uint32Array);
            const resource = {
                byteLength: props.data.byteLength,
                writes: 0,
                write() {
                    this.writes += 1;
                },
                destroy() {
                    this.destroyed = true;
                },
            };
            resources.push(resource);
            return resource;
        },
        createTexture(props) {
            const resource = {
                width: props.width,
                height: props.height,
                writes: 0,
                writeData() {
                    this.writes += 1;
                },
                destroy() {
                    this.destroyed = true;
                },
            };
            resources.push(resource);
            return resource;
        },
    };
    const mesh = createContourMesh(
        [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
        ],
        [2, 2],
    );
    const surface = {
        state: {},
        context: { device, viewport: { width: 800, height: 600 } },
        getShaders: () => ({}),
        props: {
            id: 'test-surface',
            mesh,
            field: updateContourValues(mesh, [0, 1, 2, 3], [0.5, 2.5]),
            table: new Float32Array(16),
            levelCount: 2,
            lineWidth: 2,
        },
        setState(values) {
            Object.assign(this.state, values);
        },
    };
    ContourSurface.prototype.initializeState.call(surface);
    ContourSurface.prototype.updateState.call(surface, { props: surface.props, oldProps: {} });
    const initial = { ...surface.state };
    const oldProps = surface.props;
    surface.props = { ...oldProps, field: updateContourValues(mesh, [3, 2, 1, 0], [0.5, 2.5]) };
    ContourSurface.prototype.updateState.call(surface, { props: surface.props, oldProps });
    for (const key of ['positions', 'scalars', 'segments', 'texture'])
        assert.equal(surface.state[key], initial[key]);
    assert.equal(surface.state.scalarValues, initial.scalarValues);
    assert.equal(surface.state.scalars.writes, 1);
    assert.equal(surface.state.segments.writes, 1);
    assert.deepEqual(
        surface.state.scalarValues.subarray(0, surface.props.field.values.length),
        surface.props.field.values,
    );
    assert.equal(surface.state.model.vertexCount, 4);
    assert.equal(surface.state.model.topology, 'triangle-strip');
    assert.equal(surface.state.model.instanceCount, surface.props.field.segments.length / 4);
    surface.state.model.setInstanceCount(0);
    ContourSurface.prototype.draw.call(surface);
    assert.equal(surface.state.model.drawnInstanceCount, surface.props.field.segments.length / 4);
    ContourSurface.prototype.finalizeState.call(surface);
    assert.ok(resources.every((resource) => resource.destroyed));
    assert.equal(surface.state.model.destroyed, true);
});

test('GPU contour nested inputs and automatic unstructured fallback retain alignment', () => {
    const mesh = createContourMesh([
        [
            [0, 0],
            [1, 0],
        ],
        [
            [0, 1],
            [1, 1],
        ],
    ]);
    assert.equal(mesh.triangulationMode, 'quadkey');
    assert.deepEqual(mesh.shape, [2, 2]);
    const field = updateContourValues(mesh, [
        [0, 1],
        [2, 3],
    ]);
    assert.equal(field.values.length, mesh.positions.length / 3);
    const points = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
    ];
    const unstructured = createContourMesh(points, [1, 4], 'auto');
    assert.equal(unstructured.triangulationMode, 'unstructured');
    assert.equal(updateContourValues(unstructured, [0, 1, 2, 3]).values.length, 4);
});
