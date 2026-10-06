import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import TriangulateGrid from '../src/layers/shadedLayer/TriangulateGrid.js';

const require = createRequire(import.meta.url);
const { Attribute } = require('@deck.gl/core');
const modules = new Map();

function loadSource(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    });
    const resolveImport = (name) => {
        if (name.endsWith('/graphicsUtilities')) {
            return {
                normalize() {
                    throw new Error('Supply pre-normalized values in these tests.');
                },
            };
        }
        if (name === './TriangulateGrid') {
            return { __esModule: true, default: TriangulateGrid };
        }
        if (name.startsWith('.')) {
            const base = path.resolve(path.dirname(filename), name);
            const resolved = [base, `${base}.ts`, `${base}.js`].find(
                (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
            );
            if (!resolved) throw new Error(`Cannot resolve ${name} from ${filename}`);
            return loadSource(resolved);
        }
        return require(name);
    };
    vm.runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, { filename })(
        resolveImport,
        loadedModule,
        loadedModule.exports,
    );
    return loadedModule.exports;
}

const sourceRoot = fileURLToPath(new URL('../src/layers/shadedLayer/', import.meta.url));
const ShadedLayer = loadSource(path.join(sourceRoot, 'solid-polygon-layer.ts')).default;
const PolygonTesselator = loadSource(path.join(sourceRoot, 'polygon-tesselator.ts')).default;

class MemoryBuffer {
    constructor({ byteLength }) {
        this.byteLength = byteLength;
        this.bytes = new Uint8Array(byteLength);
        this.uploads = 0;
    }

    write(value, offset = 0) {
        this.bytes.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), offset);
        this.uploads += 1;
    }

    destroy() {}
}

function makeGrid(rows, cols, longitude = -125, latitude = 25) {
    return Array.from({ length: rows * cols }, (_, index) => [
        longitude + (index % cols),
        latitude + Math.floor(index / cols),
    ]);
}

function makeLayer() {
    const device = { type: 'webgl', createBuffer: (props) => new MemoryBuffer(props) };
    const layer = {
        internalState: { hasPickingBuffer: false },
        state: {
            polygonTesselator: new PolygonTesselator({ fp64: true, IndexType: Uint32Array }),
            models: [],
        },
        context: { viewport: { resolution: undefined } },
        geometryUpdates: 0,
        setState(values) {
            Object.assign(this.state, values);
        },
        use64bitPositions() {
            return true;
        },
        setBuffers: ShadedLayer.prototype.setBuffers,
        updateGeometry(params) {
            this.geometryUpdates += 1;
            ShadedLayer.prototype.updateGeometry.call(this, params);
        },
        setTexture() {},
        _getModels() {
            return { models: [] };
        },
    };
    const attribute = new Attribute(device, {
        id: 'vertexPositions',
        size: 3,
        type: 'float64',
        fp64: true,
        noAlloc: true,
        accessor: 'getPolygon',
        update: ShadedLayer.prototype.calculatePositions,
    });
    layer.getAttributeManager = () => ({
        invalidateAll() {
            attribute.setNeedsUpdate();
        },
    });
    const defaults = {
        id: 'shared-shaded-layer',
        triangulationMode: 'quadkey',
        elevation: 0,
        _normalize: false,
        positionFormat: 'XYZ',
        filled: true,
        extensions: [],
    };
    layer.props = defaults;
    return {
        layer,
        attribute,
        render(inputs, dataChanged = 'data') {
            const oldProps = layer.props;
            const props = { ...defaults, data: inputs.ndata, ...inputs };
            layer.props = props;
            ShadedLayer.prototype.updateState.call(layer, {
                props,
                oldProps,
                changeFlags: { dataChanged },
            });
            const { attributes, startIndices } = layer.props.data;
            attribute.startIndices = layer.state.startIndices;
            attribute.numInstances = layer.state.numInstances;
            if (
                !attribute.setExternalBuffer(attributes.vertexPositions) &&
                !attribute.setBinaryValue(attributes.getPolygon, startIndices)
            ) {
                attribute.updateBuffer({
                    numInstances: layer.state.numInstances,
                    data: layer.props.data,
                    props: layer.props,
                    context: layer,
                });
            }
            return attributes;
        },
    };
}

function assertPositions(attribute, expected) {
    const stride = attribute.getAccessor().stride / Float32Array.BYTES_PER_ELEMENT;
    const uploaded = new Float32Array(attribute.buffer.bytes.buffer);
    for (let index = 0; index < expected.length / 3; index += 1) {
        assert.deepEqual(
            Array.from(uploaded.subarray(index * stride, index * stride + 3)),
            Array.from(expected.subarray(index * 3, index * 3 + 3)),
        );
    }
}

test('dataset switches and scalar scrubs retain a consistent position buffer', () => {
    const { layer, attribute, render } = makeLayer();
    const rrfs = { lonlatGrid: makeGrid(5, 6, -130, 20), shape: [5, 6] };
    const href = { lonlatGrid: makeGrid(2, 3), shape: [2, 3] };
    for (const dataset of [rrfs, href, rrfs]) {
        const count = dataset.lonlatGrid.length;
        const initial = render({ ...dataset, ndata: new Float32Array(count).fill(0.5) });
        const geometryUpdates = layer.geometryUpdates;
        const uploads = attribute.buffer.uploads;
        for (const value of [0.2, 0.8, 0.4]) {
            const attributes = render({ ...dataset, ndata: new Float32Array(count).fill(value) });
            assert.equal(attributes.vertexPositions, initial.vertexPositions);
            assert.equal(attributes.getPolygon, initial.getPolygon);
            assert.equal(attributes.getTriangleIndices, initial.getTriangleIndices);
            assert.notEqual(attributes.getPolygonData.value, initial.getPolygonData.value);
            assertPositions(attribute, initial.getPolygon.value);
            assert.equal(attribute.getAccessor().stride, 12);
            assert.equal(layer.geometryUpdates, geometryUpdates);
            assert.equal(attribute.buffer.uploads, uploads);
        }
    }
    assert.equal(layer.geometryUpdates, 3);
});

test('shape, triangulation mode, and elevation update geometry without a data change flag', () => {
    const { layer, attribute, render } = makeLayer();
    const lonlatGrid = makeGrid(2, 3);
    const ndata = new Float32Array(6).fill(0.5);
    const initial = render({ lonlatGrid, shape: [2, 3], ndata });
    const reshaped = render({ lonlatGrid, shape: [3, 2], ndata }, false);
    assert.notEqual(reshaped.getPolygon, initial.getPolygon);
    assert.notDeepEqual(reshaped.getTriangleIndices.value, initial.getTriangleIndices.value);
    assert.equal(layer.geometryUpdates, 2);
    assertPositions(attribute, reshaped.getPolygon.value);

    const cells = render(
        { lonlatGrid, shape: [3, 2], ndata, triangulationMode: 'quadkey-cells' },
        false,
    );
    assert.equal(layer.geometryUpdates, 3);
    assert.equal(layer.state.numInstances, 24);
    assert.equal(layer.state.polygonTesselator.vertexCount, 36);
    assertPositions(attribute, cells.getPolygon.value);

    const elevated = render(
        { lonlatGrid, shape: [3, 2], ndata, triangulationMode: 'quadkey-cells', elevation: 100 },
        false,
    );
    assert.equal(layer.geometryUpdates, 4);
    assert.notEqual(elevated.getPolygon, cells.getPolygon);
    for (let index = 2; index < elevated.getPolygon.value.length; index += 3) {
        assert.equal(elevated.getPolygon.value[index], 100);
    }
    assertPositions(attribute, elevated.getPolygon.value);
});

test('different grids with identical sampled cache coordinates do not share geometry', () => {
    const { render } = makeLayer();
    const firstGrid = makeGrid(2, 3);
    const secondGrid = firstGrid.map((point) => [...point]);
    secondGrid[3][0] += 0.25;
    const inputs = { shape: [2, 3], ndata: new Float32Array(6).fill(0.5) };
    const initial = render({ ...inputs, lonlatGrid: firstGrid });
    const changed = render({ ...inputs, lonlatGrid: secondGrid });
    assert.notEqual(changed.getPolygon, initial.getPolygon);
    assert.equal(changed.getPolygon.value[9], secondGrid[3][0]);
});

test('ndata and opacity-only updates retain the cached geometry descriptors', () => {
    const { layer, attribute, render } = makeLayer();
    const inputs = {
        lonlatGrid: makeGrid(2, 3),
        shape: [2, 3],
        data: undefined,
        ndata: new Float32Array(6).fill(0.5),
    };
    const initial = render(inputs);
    const uploads = attribute.buffer.uploads;
    const values = render({ ...inputs, ndata: new Float32Array(6).fill(0.75) });
    assert.equal(values.vertexPositions, initial.vertexPositions);
    assert.ok(values.getPolygonData.value.every((value) => value === 0.75));
    const opacity = render({ ...inputs, nodata: new Float32Array(6).fill(0.25) }, false);
    assert.equal(opacity.vertexPositions, initial.vertexPositions);
    assert.ok(opacity.getOpacity.every((value) => value === Math.fround(0.25 * 0.01)));
    assert.equal(layer.geometryUpdates, 1);
    assert.equal(attribute.buffer.uploads, uploads);
});

test('normalized geometry retains tessellated positions across scalar updates', () => {
    const { layer, attribute, render } = makeLayer();
    render({ lonlatGrid: makeGrid(5, 6), shape: [5, 6], ndata: new Float32Array(30).fill(0.5) });
    const inputs = {
        lonlatGrid: makeGrid(2, 3),
        shape: [2, 3],
        ndata: new Float32Array(6).fill(0.5),
        _normalize: true,
    };
    const initial = render(inputs);
    assert.ok(initial.vertexPositions);
    assert.notEqual(initial.vertexPositions, initial.getPolygon);
    assert.equal(attribute.getAccessor().stride, 24);
    const expected = layer.state.polygonTesselator
        .get('positions')
        .subarray(0, layer.state.numInstances * 3);
    assertPositions(attribute, expected);
    const uploads = attribute.buffer.uploads;
    const geometryUpdates = layer.geometryUpdates;
    const scrubbed = render({ ...inputs, ndata: new Float32Array(6).fill(0.75) });
    assert.equal(scrubbed.vertexPositions, initial.vertexPositions);
    assertPositions(attribute, expected);
    assert.equal(layer.geometryUpdates, geometryUpdates);
    assert.equal(attribute.buffer.uploads, uploads);
});

test('all triangulation modes retain geometry buffers during scalar updates', () => {
    const { layer, attribute, render } = makeLayer();
    const lonlatGrid = makeGrid(3, 4);
    for (const triangulationMode of [
        'unstructured',
        'quadkey',
        'quadkey-cells',
        'spherical',
        'spherical-cells',
    ]) {
        const inputs = { lonlatGrid, shape: [3, 4], triangulationMode };
        const initial = render({ ...inputs, ndata: new Float32Array(12).fill(0.5) });
        const geometryUpdates = layer.geometryUpdates;
        const uploads = attribute.buffer.uploads;
        const scrubbed = render({ ...inputs, ndata: new Float32Array(12).fill(0.75) });
        assert.equal(scrubbed.vertexPositions, initial.vertexPositions);
        assertPositions(attribute, initial.getPolygon.value);
        assert.equal(layer.geometryUpdates, geometryUpdates);
        assert.equal(attribute.buffer.uploads, uploads);
    }
});
