import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
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

const filename = fileURLToPath(
    new URL('../src/layers/particleLayer/particle-layer.ts', import.meta.url),
);
const ParticleLayer = loadSource(filename).default;

class MemoryTexture {
    constructor(props) {
        this.width = props.width;
        this.height = props.height;
        this.sampler = props.sampler;
        this.data = props.data.slice();
        this.uploads = 1;
        this.destroys = 0;
    }

    copyImageData({ data, width, height }) {
        assert.equal(width, this.width);
        assert.equal(height, this.height);
        assert.equal(this.destroys, 0);
        this.data = data.slice();
        this.uploads += 1;
    }

    destroy() {
        this.destroys += 1;
    }
}

function makeLayer(props = {}) {
    const layer = Object.create(ParticleLayer.prototype);
    layer.props = {
        lonlatGrid: [
            [-125, 25],
            [-124, 25],
            [-125, 26],
            [-124, 26],
        ],
        shape: [2, 2],
        dataDir: [90, 90, 90, 90],
        dataMag: [10, 10, 10, 10],
        ...props,
    };
    layer.state = {};
    layer.setState = (values) => Object.assign(layer.state, values);
    layer.textures = [];
    layer.context = {
        device: {
            createTexture(textureProps) {
                const texture = new MemoryTexture(textureProps);
                layer.textures.push(texture);
                return texture;
            },
        },
    };
    return layer;
}

test('resolved particle grids are cached by source and shape values', () => {
    const layer = makeLayer();
    const initial = layer._resolveGrid();
    assert.equal(layer._resolveGrid(), initial);
    layer.props = { ...layer.props, shape: [2, 2], dataDir: [90, 90, 90, 90] };
    assert.equal(layer._resolveGrid(), initial);
    layer.props = { ...layer.props, shape: [1, 4] };
    const reshaped = layer._resolveGrid();
    assert.notEqual(reshaped, initial);
    assert.equal(reshaped.rows, 1);
    assert.equal(reshaped.cols, 4);
    layer.props = { ...layer.props, lonlatGrid: layer.props.lonlatGrid.map((point) => [...point]) };
    assert.notEqual(layer._resolveGrid(), reshaped);
});

test('wind updates reuse preparation arrays and upload the same texture without resetting particles', () => {
    const layer = makeLayer();
    const texture = layer._createWindTexture();
    const prepared = layer.state.windTextureData;
    const initial = texture.data.slice();
    const sourcePositions = {};
    const targetPositions = {};
    const transform = {};
    Object.assign(layer.state, {
        initialized: true,
        texture,
        sourcePositions,
        targetPositions,
        transform,
        ringBufferIndex: 17,
        previousTime: 42,
    });
    layer.props = { ...layer.props, dataDir: [180, 180, 180, 180], dataMag: [20, 20, 20, 20] };
    layer._updateWindTexture();
    assert.equal(layer.state.texture, texture);
    assert.equal(layer.textures.length, 1);
    assert.equal(texture.uploads, 2);
    assert.equal(texture.destroys, 0);
    assert.equal(layer.state.windTextureData, prepared);
    assert.notDeepEqual(texture.data, initial);
    assert.equal(layer.state.sourcePositions, sourcePositions);
    assert.equal(layer.state.targetPositions, targetPositions);
    assert.equal(layer.state.transform, transform);
    assert.equal(layer.state.ringBufferIndex, 17);
    assert.equal(layer.state.previousTime, 42);
});

function assertUniformWind(texture, direction, magnitude) {
    const rad = (direction * Math.PI) / 180;
    const windU = Math.fround(-magnitude * Math.sin(rad));
    const windV = Math.fround(-magnitude * Math.cos(rad));
    const noise = (x, y) => (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    let coveredPixels = 0;
    for (let y = 0; y < texture.height; y += 1) {
        for (let x = 0; x < texture.width; x += 1) {
            const offset = (y * texture.width + x) * 4;
            if (texture.data[offset + 3] === 0) continue;
            coveredPixels += 1;
            const expectedU = Math.fround(windU + (noise(x * 0.1, y * 0.1) - 0.5) * 0.02);
            const expectedV = Math.fround(
                windV + (noise(x * 0.1 + 100, y * 0.1 + 100) - 0.5) * 0.02,
            );
            assert.ok(Math.abs(texture.data[offset] - expectedU) < 1e-6);
            assert.ok(Math.abs(texture.data[offset + 1] - expectedV) < 1e-6);
            assert.equal(texture.data[offset + 2], 0);
            assert.equal(texture.data[offset + 3], 1);
        }
    }
    assert.ok(coveredPixels > 0);
}

function rasterizeReferenceWind(layer) {
    const grid = layer._resolveGrid();
    const { width, height, pointX, pointY } = layer._getWindTextureData(grid);
    const windU = new Float32Array(grid.points.length);
    const windV = new Float32Array(grid.points.length);
    const valid = new Uint8Array(grid.points.length);
    const result = new Float32Array(width * height * 4);
    for (let index = 0; index < grid.points.length; index += 1) {
        const direction = Number(layer.props.dataDir?.[index]);
        const magnitude = Number(layer.props.dataMag?.[index]);
        if (
            !Number.isFinite(pointX[index]) ||
            !Number.isFinite(pointY[index]) ||
            !Number.isFinite(direction) ||
            !Number.isFinite(magnitude) ||
            magnitude < 0
        ) {
            continue;
        }
        const radians = (direction * Math.PI) / 180;
        windU[index] = -magnitude * Math.sin(radians);
        windV[index] = -magnitude * Math.cos(radians);
        valid[index] = 1;
    }

    for (const [i0, i1, i2] of layer._buildMeshTriangles(grid)) {
        if (!valid[i0] || !valid[i1] || !valid[i2]) continue;
        const x0 = pointX[i0];
        const y0 = pointY[i0];
        const x1 = pointX[i1];
        const y1 = pointY[i1];
        const x2 = pointX[i2];
        const y2 = pointY[i2];
        const denominator = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
        if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-8) continue;
        const minX = Math.max(0, Math.min(width - 1, Math.floor(Math.min(x0, x1, x2))));
        const maxX = Math.max(0, Math.min(width - 1, Math.ceil(Math.max(x0, x1, x2))));
        const minY = Math.max(0, Math.min(height - 1, Math.floor(Math.min(y0, y1, y2))));
        const maxY = Math.max(0, Math.min(height - 1, Math.ceil(Math.max(y0, y1, y2))));
        for (let row = minY; row <= maxY; row += 1) {
            for (let column = minX; column <= maxX; column += 1) {
                const px = column + 0.5;
                const py = row + 0.5;
                const w0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denominator;
                const w1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denominator;
                const w2 = 1 - w0 - w1;
                if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
                const offset = (row * width + column) * 4;
                result[offset] = w0 * windU[i0] + w1 * windU[i1] + w2 * windU[i2];
                result[offset + 1] = w0 * windV[i0] + w1 * windV[i1] + w2 * windV[i2];
                result[offset + 3] = 1;
            }
        }
    }

    const noise = (longitude, latitude) =>
        (Math.sin(longitude * 12.9898 + latitude * 78.233) * 43758.5453) % 1;
    for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
            const offset = (row * width + column) * 4;
            if (result[offset + 3] === 0) continue;
            result[offset] += (noise(column * 0.1, row * 0.1) - 0.5) * 0.02;
            result[offset + 1] += (noise(column * 0.1 + 100, row * 0.1 + 100) - 0.5) * 0.02;
        }
    }
    return result;
}

test('reused textures preserve wind interpolation and deterministic turbulence', () => {
    const layer = makeLayer();
    const texture = layer._createWindTexture();
    assertUniformWind(texture, 90, 10);
    layer.state.texture = texture;
    layer.props = { ...layer.props, dataDir: [0, 0, 0, 0], dataMag: [20, 20, 20, 20] };
    layer._updateWindTexture();
    assertUniformWind(texture, 0, 20);
});

test('missing wind values clear old coverage and restored values recover the original texture', () => {
    const layer = makeLayer();
    const texture = layer._createWindTexture();
    const initial = texture.data.slice();
    layer.state.texture = texture;
    layer.props = { ...layer.props, dataMag: [NaN, NaN, NaN, NaN] };
    layer._updateWindTexture();
    assert.ok(texture.data.every((value) => value === 0));
    layer.props = { ...layer.props, dataMag: [10, 10, 10, 10] };
    layer._updateWindTexture();
    assert.deepEqual(texture.data, initial);
    layer.props = { ...layer.props, dataMag: [10, -1, 10, 10] };
    layer._updateWindTexture();
    assert.ok(texture.data.every((value) => value === 0));
});

test('wind changes outside the former fingerprint samples still update texture values', () => {
    const layer = makeLayer();
    const texture = layer._createWindTexture();
    const initial = texture.data.slice();
    layer.state.texture = texture;
    layer.props = { ...layer.props, dataMag: [10, 30, 10, 10] };
    layer._updateWindTexture();
    assert.notDeepEqual(texture.data, initial);
    assert.equal(layer.textures.length, 1);
});

test('grid replacement refreshes projection and bounds while reusing compatible storage', () => {
    const layer = makeLayer();
    layer._updateWindTexture();
    const texture = layer.state.texture;
    const prepared = layer.state.windTextureData;
    assert.deepEqual(layer._getEffectiveBounds(), [-125, 25, -124, 26]);
    layer.props = {
        ...layer.props,
        lonlatGrid: [
            [10, 5],
            [11, 5],
            [10, 6],
            [11, 6],
        ],
    };
    layer._updateWindTexture();
    const changed = layer.state.windTextureData;
    assert.notEqual(changed, prepared);
    assert.notEqual(changed.grid, prepared.grid);
    assert.notEqual(changed.rasterLookup, prepared.rasterLookup);
    assert.equal(changed.uvData, prepared.uvData);
    assert.equal(changed.turbulence, prepared.turbulence);
    assert.equal(layer.state.texture, texture);
    assert.equal(texture.destroys, 0);
    assert.deepEqual(layer._getEffectiveBounds(), [10, 5, 11, 6]);
    assertUniformWind(texture, 90, 10);
});

test('texture dimension and wrapping changes recreate only the owned wind texture', () => {
    const layer = makeLayer();
    layer._updateWindTexture();
    const initial = layer.state.texture;
    layer.props = {
        ...layer.props,
        lonlatGrid: Array.from({ length: 130 }, (_, index) => [
            -125 + (index % 2),
            25 + Math.floor(index / 2) / 64,
        ]),
        shape: [65, 2],
        dataDir: new Array(130).fill(90),
        dataMag: new Array(130).fill(10),
    };
    layer._updateWindTexture();
    const resized = layer.state.texture;
    assert.notEqual(resized, initial);
    assert.equal(initial.destroys, 1);
    assert.equal(resized.width, 64);
    assert.equal(resized.height, 65);
    layer.props = {
        ...layer.props,
        lonlatGrid: [
            [-180, -90],
            [180, -90],
            [-180, 90],
            [180, 90],
        ],
        shape: [2, 2],
        dataDir: [90, 90, 90, 90],
        dataMag: [10, 10, 10, 10],
    };
    layer._updateWindTexture();
    const globalTexture = layer.state.texture;
    assert.equal(resized.destroys, 1);
    assert.equal(globalTexture.sampler.addressModeU, 'repeat');
    layer.props = {
        ...layer.props,
        lonlatGrid: [
            [-125, 25],
            [-124, 25],
            [-125, 26],
            [-124, 26],
        ],
    };
    layer._updateWindTexture();
    assert.equal(globalTexture.destroys, 1);
    assert.notEqual(layer.state.texture, globalTexture);
    assert.equal(layer.state.texture.width, globalTexture.width);
    assert.equal(layer.state.texture.height, globalTexture.height);
    assert.equal(layer.state.texture.sampler.addressModeU, 'clamp-to-edge');
});

test('different panels own separate textures and cleanup does not destroy another panel', () => {
    const first = makeLayer();
    const second = makeLayer({ lonlatGrid: first.props.lonlatGrid });
    first._updateWindTexture();
    second._updateWindTexture();
    const firstTexture = first.state.texture;
    const secondTexture = second.state.texture;
    const secondData = secondTexture.data.slice();
    assert.notEqual(firstTexture, secondTexture);
    first.props = { ...first.props, dataMag: [20, 20, 20, 20] };
    first._updateWindTexture();
    assert.deepEqual(secondTexture.data, secondData);
    assert.equal(secondTexture.uploads, 1);
    first.state.initialized = true;
    first._deleteTransformFeedback();
    first._deleteTransformFeedback();
    assert.equal(firstTexture.destroys, 1);
    assert.equal(secondTexture.destroys, 0);
    assert.equal(first.state.generatedWindTexture, undefined);
});

test('image transitions and cleanup never destroy caller-owned textures', () => {
    const layer = makeLayer();
    layer._updateWindTexture();
    const generated = layer.state.texture;
    const external = new MemoryTexture({
        width: 64,
        height: 64,
        data: new Float32Array(64 * 64 * 4),
    });
    const replacement = new MemoryTexture({
        width: 64,
        height: 64,
        data: new Float32Array(64 * 64 * 4),
    });
    layer.props = { ...layer.props, image: external };
    layer._updateWindTexture();
    assert.equal(generated.destroys, 1);
    assert.equal(layer.state.texture, external);
    assert.equal(layer.state.generatedWindTexture, undefined);
    layer.props = { ...layer.props, image: replacement };
    layer._updateWindTexture();
    assert.equal(external.destroys, 0);
    assert.equal(layer.state.texture, replacement);
    layer.state.initialized = true;
    layer._deleteTransformFeedback();
    assert.equal(replacement.destroys, 0);
});

test('preparation and owned textures survive layer-state transfer', () => {
    const first = makeLayer();
    first._updateWindTexture();
    const next = makeLayer({ ...first.props, dataMag: [20, 20, 20, 20] });
    next.state = first.state;
    next.context = first.context;
    const prepared = first.state.windTextureData;
    const texture = first.state.texture;
    next._updateWindTexture();
    assert.equal(next.state.windTextureData, prepared);
    assert.equal(next.state.windTextureData.rasterLookup, prepared.rasterLookup);
    assert.equal(next.state.texture, texture);
    assert.equal(texture.uploads, 2);
    assert.equal(texture.destroys, 0);
});

test('replacement grids cannot collide through the former sampled coordinate keys', () => {
    const layer = makeLayer();
    layer._updateWindTexture();
    const original = layer.state.gridCache.grid;
    const changedGrid = layer.props.lonlatGrid.map((point) => [...point]);
    changedGrid[1][0] = -122;
    layer.props = { ...layer.props, lonlatGrid: changedGrid };
    layer._updateWindTexture();
    assert.notEqual(layer.state.gridCache.grid.gridKey, original.gridKey);
    assert.deepEqual(layer.state.bounds, [-125, 25, -122, 26]);
});

test('nested grids and unstructured rings reuse preparation during wind updates', () => {
    for (const lonlatGrid of [
        [
            [
                [-125, 25],
                [-124, 25],
            ],
            [
                [-125, 26],
                [-124, 26],
            ],
        ],
        [
            [-125, 25],
            [-124, 25],
            [-124, 26],
            [-125, 26],
        ],
    ]) {
        const layer = makeLayer({ lonlatGrid, shape: undefined });
        layer._updateWindTexture();
        const prepared = layer.state.windTextureData;
        const texture = layer.state.texture;
        assertUniformWind(texture, 90, 10);
        layer.props = { ...layer.props, dataMag: [20, 20, 20, 20] };
        layer._updateWindTexture();
        assert.equal(layer.state.windTextureData, prepared);
        assert.equal(layer.state.texture, texture);
        assertUniformWind(texture, 90, 20);
    }
});

test('wind-only updates reuse raster candidates without visiting mesh triangles', () => {
    const layer = makeLayer();
    layer._updateWindTexture();
    const lookup = layer.state.windTextureData.rasterLookup;
    assert.ok(lookup);
    assert.ok(lookup.pixelHeads.some((candidate) => candidate !== -1));
    assert.ok(lookup.weights instanceof Float64Array);
    layer._buildMeshTriangles = () => assert.fail('wind-only update revisited mesh triangles');
    layer.props = { ...layer.props, dataDir: [0, 0, 0, 0], dataMag: [20, 20, 20, 20] };
    layer._updateWindTexture();
    assert.equal(layer.state.windTextureData.rasterLookup, lookup);
    assertUniformWind(layer.state.texture, 0, 20);
});

test('cached interpolation exactly matches triangle rasterization across grid layouts', () => {
    const rows = [
        [
            [-125, 25],
            [-124.4, 25.2],
            [-123.6, 25],
        ],
        [
            [-125.1, 25.7],
            [-124.2, 26],
            [-123.4, 25.8],
        ],
        [
            [-125, 26.6],
            [-124.5, 26.9],
            [-123.5, 26.7],
        ],
    ];
    const fixtures = [
        { name: 'skewed structured', lonlatGrid: rows.flat(), shape: [3, 3] },
        { name: 'nested structured', lonlatGrid: rows, shape: undefined },
        {
            name: 'concave unstructured',
            lonlatGrid: [
                [-2, -1],
                [0, -1],
                [0, 0],
                [-1, 0],
                [-1, 1],
                [-2, 1],
            ],
            shape: undefined,
        },
        {
            name: 'dateline',
            lonlatGrid: [
                [179, 20],
                [180, 20],
                [-179, 20],
                [179, 21],
                [180, 21],
                [-179, 21],
            ],
            shape: [2, 3],
        },
        {
            name: 'global',
            lonlatGrid: [-90, 0, 90].flatMap((latitude) =>
                [-180, -60, 60, 180].map((longitude) => [longitude, latitude]),
            ),
            shape: [3, 4],
        },
        {
            name: 'degenerate',
            lonlatGrid: [
                [0, 0],
                [1, 0],
                [2, 0],
                [3, 0],
            ],
            shape: [2, 2],
        },
        {
            name: 'invalid coordinates',
            lonlatGrid: [
                [0, 0],
                [1, 0],
                [NaN, 1],
                [1, 1],
            ],
            shape: [2, 2],
        },
    ];
    for (const fixture of fixtures) {
        const layer = makeLayer(fixture);
        const pointCount = layer._resolveGrid().points.length;
        let lookup;
        for (let update = 0; update < 4; update += 1) {
            const dataDir = Float32Array.from(
                { length: pointCount },
                (_, index) => index * 51 + update * 47 - 180,
            );
            const dataMag = Float32Array.from(
                { length: pointCount },
                (_, index) => index * 7 + update * 3,
            );
            if (update === 1) dataMag[Math.floor(pointCount / 2)] = NaN;
            if (update === 2) {
                dataDir[1] = Infinity;
                dataMag[pointCount - 1] = -1;
            }
            layer.props = { ...layer.props, dataDir, dataMag };
            layer._updateWindTexture();
            assert.deepEqual(
                layer.state.texture.data,
                rasterizeReferenceWind(layer),
                `${fixture.name}, update ${update}`,
            );
            lookup ??= layer.state.windTextureData.rasterLookup;
            assert.equal(layer.state.windTextureData.rasterLookup, lookup);
        }
    }
});

test('overlapping cells preserve last-valid precedence and grow candidate storage', () => {
    const directions = [20, 70, 120, 170, 220, 270];
    const layer = makeLayer({
        lonlatGrid: [
            [0, 0],
            [1, 0],
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 1],
        ],
        shape: [2, 3],
        dataDir: directions,
        dataMag: [5, 10, 15, 20, 25, 30],
    });
    layer._updateWindTexture();
    const texture = layer.state.texture;
    const initial = texture.data.slice();
    const lookup = layer.state.windTextureData.rasterLookup;
    assert.ok(lookup.next.length > lookup.pixelHeads.length);
    assert.deepEqual(initial, rasterizeReferenceWind(layer));
    layer.props = {
        ...layer.props,
        dataDir: directions.map((value, index) => (index === 2 ? NaN : value)),
    };
    layer._updateWindTexture();
    assert.deepEqual(texture.data, rasterizeReferenceWind(layer));
    assert.notDeepEqual(texture.data, initial);
    assert.equal(texture.data[(20 * texture.width + 30) * 4 + 3], 1);
    layer.props = {
        ...layer.props,
        dataDir: directions.map((value, index) => (index === 1 || index === 2 ? NaN : value)),
    };
    layer._updateWindTexture();
    assert.ok(texture.data.every((value) => value === 0));
    layer.props = { ...layer.props, dataDir: [...directions] };
    layer._updateWindTexture();
    assert.deepEqual(texture.data, initial);
    assert.equal(layer.state.windTextureData.rasterLookup, lookup);
});

test('shared edges fall back to earlier valid triangles without rebuilding coverage', () => {
    const layer = makeLayer({ dataDir: [10, 45, 125, 200], dataMag: [5, 10, 15, 20] });
    layer._updateWindTexture();
    const lookup = layer.state.windTextureData.rasterLookup;
    assert.notEqual(lookup.next[lookup.pixelHeads[0]], -1);
    layer.props = { ...layer.props, dataMag: [5, 10, 15, NaN] };
    layer._updateWindTexture();
    assert.equal(layer.state.texture.data[3], 1);
    assert.deepEqual(layer.state.texture.data, rasterizeReferenceWind(layer));
    assert.equal(layer.state.windTextureData.rasterLookup, lookup);
});

test('initially missing winds retain geometry coverage for later valid updates', () => {
    const layer = makeLayer({ dataMag: [NaN, NaN, NaN, NaN] });
    layer._updateWindTexture();
    const lookup = layer.state.windTextureData.rasterLookup;
    assert.ok(layer.state.texture.data.every((value) => value === 0));
    assert.ok(lookup.pixelHeads.some((candidate) => candidate !== -1));
    layer.props = { ...layer.props, dataMag: [10, 10, 10, 10], shape: [2, 2] };
    layer._buildMeshTriangles = () => assert.fail('restoring valid winds rebuilt coverage');
    layer._updateWindTexture();
    assert.equal(layer.state.windTextureData.rasterLookup, lookup);
    assertUniformWind(layer.state.texture, 90, 10);
});

test('shape values invalidate the lookup even when texture dimensions are unchanged', () => {
    const layer = makeLayer();
    layer._updateWindTexture();
    const lookup = layer.state.windTextureData.rasterLookup;
    const texture = layer.state.texture;
    layer.props = { ...layer.props, shape: [1, 4] };
    layer._updateWindTexture();
    assert.notEqual(layer.state.windTextureData.rasterLookup, lookup);
    assert.equal(layer.state.texture, texture);
    assert.deepEqual(texture.data, rasterizeReferenceWind(layer));
});
