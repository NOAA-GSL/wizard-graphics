import TriangulateGrid from '../shadedLayer/TriangulateGrid.js';
import RBush from 'rbush';

export function normalizeLevels(levels = []) {
    const sorted = [...new Set(Array.from(levels, Math.fround).filter(Number.isFinite))].sort(
        (left, right) => left - right,
    );
    if (sorted.length > 2048) throw new Error('GpuContourLayer supports at most 2048 levels.');
    return sorted;
}

export function createContourMesh(points, shape, triangulationMode, elevation = 0) {
    const nested = Array.isArray(points[0]?.[0]);
    const resolvedShape = shape || (nested ? [points.length, points[0].length] : undefined);
    const mode =
        !triangulationMode || triangulationMode === 'auto'
            ? resolvedShape?.[0] > 1 && resolvedShape?.[1] > 1
                ? 'quadkey'
                : 'unstructured'
            : triangulationMode;
    if (!['quadkey', 'spherical', 'unstructured'].includes(mode)) {
        throw new Error(`Unsupported GpuContourLayer triangulationMode: ${mode}`);
    }
    const dims =
        resolvedShape?.[0] > 1 && resolvedShape?.[1] > 1 ? resolvedShape.slice() : undefined;
    const [positions, triangleIndices] = TriangulateGrid.triangulate(
        points,
        'positions',
        dims,
        3,
        elevation,
        1,
        mode,
    );
    return { positions, triangleIndices, shape: dims, triangulationMode: mode };
}

export function updateContourValues(mesh, data, levels) {
    const flatData = Array.isArray(data[0]) ? data.flat() : data;
    const source = Float32Array.from(flatData, (value) => (Number.isFinite(value) ? value : NaN));
    const values = TriangulateGrid.triangulate(
        source,
        'data',
        mesh.shape,
        1,
        0,
        1,
        mesh.triangulationMode,
    );
    const triangles = mesh.triangleIndices;
    const positions = mesh.positions;
    if (levels && !levels.length)
        return { values, indices: new Uint32Array(0), segments: new Uint32Array(0) };
    const valid = new Uint8Array(values.length);
    const firstLevels = levels && new Uint16Array(values.length);
    const lastLevels = levels && new Uint16Array(values.length);
    for (let vertex = 0; vertex < values.length; vertex += 1) {
        const value = values[vertex];
        if (
            !Number.isFinite(value) ||
            !Number.isFinite(positions[vertex * 3]) ||
            !Number.isFinite(positions[vertex * 3 + 1])
        )
            continue;
        valid[vertex] = 1;
        if (levels) {
            const last = upperBound(levels, value);
            firstLevels[vertex] = last > 0 && levels[last - 1] === value ? last - 1 : last;
            lastLevels[vertex] = last;
        }
    }
    const indices = new Uint32Array(triangles.length);
    let segments = levels
        ? new Uint32Array(Math.max(4, Math.min(4096, (triangles.length / 3) * 4)))
        : undefined;
    let segmentCount = 0;
    let count = 0;
    for (let offset = 0; offset < triangles.length; offset += 3) {
        const firstVertex = triangles[offset];
        const secondVertex = triangles[offset + 1];
        const thirdVertex = triangles[offset + 2];
        if (!valid[firstVertex] || !valid[secondVertex] || !valid[thirdVertex]) continue;
        if (levels) {
            if (
                values[firstVertex] === values[secondVertex] &&
                values[firstVertex] === values[thirdVertex]
            )
                continue;
            const first = Math.min(
                firstLevels[firstVertex],
                firstLevels[secondVertex],
                firstLevels[thirdVertex],
            );
            const last = Math.max(
                lastLevels[firstVertex],
                lastLevels[secondVertex],
                lastLevels[thirdVertex],
            );
            if (first === last) continue;
            for (let level = first; level < last; level += 1) {
                if (segmentCount + 4 > segments.length) {
                    const expanded = new Uint32Array(segments.length * 2);
                    expanded.set(segments);
                    segments = expanded;
                }
                segments[segmentCount] = firstVertex;
                segments[segmentCount + 1] = secondVertex;
                segments[segmentCount + 2] = thirdVertex;
                segments[segmentCount + 3] = level;
                segmentCount += 4;
            }
        }
        indices[count] = firstVertex;
        indices[count + 1] = secondVertex;
        indices[count + 2] = thirdVertex;
        count += 3;
    }
    return {
        values,
        indices: count === indices.length ? mesh.triangleIndices : indices.subarray(0, count),
        segments: segments?.subarray(0, segmentCount),
    };
}

function upperBound(levels, value) {
    let low = 0;
    let high = levels.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (levels[middle] <= value) low = middle + 1;
        else high = middle;
    }
    return low;
}

export function sampleLabelCandidates(mesh, field, levels, maxCandidates = 4000) {
    const candidates = [];
    const triangleCount = field.indices.length / 3;
    const sampleCount = Math.min(triangleCount, Math.max(0, Math.floor(maxCandidates)));
    for (let sample = 0; sample < sampleCount; sample += 1) {
        const triangleIndex = Math.floor((sample * triangleCount) / sampleCount);
        const triangle = field.indices.subarray(triangleIndex * 3, triangleIndex * 3 + 3);
        const scalars = Array.from(triangle, (index) => field.values[index]);
        const minimum = Math.min(...scalars);
        const maximum = Math.max(...scalars);
        if (minimum === maximum) continue;
        const first = upperBound(levels, minimum);
        const last = upperBound(levels, maximum);
        if (first === last) continue;
        const value = levels[first + (triangleIndex % (last - first))];
        const crossings = [];
        const sources = [];
        for (let edge = 0; edge < 3; edge += 1) {
            const next = (edge + 1) % 3;
            if (scalars[edge] === scalars[next]) continue;
            const weight = (value - scalars[edge]) / (scalars[next] - scalars[edge]);
            if (weight < 0 || weight > 1) continue;
            const start = triangle[edge] * 3;
            const end = triangle[next] * 3;
            const point = [
                mesh.positions[start] + weight * (mesh.positions[end] - mesh.positions[start]),
                mesh.positions[start + 1] +
                    weight * (mesh.positions[end + 1] - mesh.positions[start + 1]),
                mesh.positions[start + 2],
            ];
            if (!crossings.some((other) => other[0] === point[0] && other[1] === point[1])) {
                crossings.push(point);
                sources.push([triangle[edge], triangle[next], weight]);
            }
        }
        if (crossings.length !== 2) continue;
        const [start, end] = crossings;
        const longitudeDelta = end[0] - start[0];
        const latitudeDelta = end[1] - start[1];
        candidates.push({
            value,
            text: `${value}`,
            position: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, start[2]],
            slope: Math.abs(latitudeDelta / longitudeDelta),
            extent: Math.hypot(longitudeDelta, latitudeDelta),
            sources,
        });
    }
    return candidates.sort((left, right) => left.slope - right.slope || right.extent - left.extent);
}

export function placeLabelCandidates(
    mesh,
    candidates,
    viewport,
    options = {},
    previousLabels = [],
) {
    const { spacing = 350, padding = 14, maxLabels = 200 } = options;
    const globalTree = new RBush();
    const valueTrees = new Map();
    const labels = [];
    const addLabel = (label, commonPosition, retained = false) => {
        const screen = viewport.project(label.position);
        if (
            !screen.every(Number.isFinite) ||
            screen[0] < 0 ||
            screen[0] > viewport.width ||
            screen[1] < 0 ||
            screen[1] > viewport.height ||
            screen[2] < 0 ||
            screen[2] > 1
        )
            return;
        if (
            viewport.resolution &&
            viewport
                .projectPosition([viewport.longitude, viewport.latitude, 0])
                .reduce((sum, value, index) => sum + value * commonPosition[index], 0) <= 0
        )
            return;
        const box = (radius) => ({
            minX: screen[0] - radius,
            minY: screen[1] - radius,
            maxX: screen[0] + radius,
            maxY: screen[1] + radius,
        });
        if (!valueTrees.has(label.value)) valueTrees.set(label.value, new RBush());
        const valueTree = valueTrees.get(label.value);
        const valueBox = box(Math.max(0, spacing) / 2);
        const globalBox = box(Math.max(0, padding) / 2);
        if (!retained && (valueTree.collides(valueBox) || globalTree.collides(globalBox))) return;
        valueTree.insert(valueBox);
        globalTree.insert(globalBox);
        labels.push(label);
    };
    for (const label of previousLabels) {
        if (labels.length >= Math.max(0, maxLabels)) break;
        addLabel(label, viewport.projectPosition(label.position), true);
    }
    for (const candidate of candidates) {
        if (labels.length >= Math.max(0, maxLabels)) break;
        const commonPosition = [0, 0, 0];
        for (const [first, second, weight] of candidate.sources) {
            const start = viewport.projectPosition(
                Array.from(mesh.positions.subarray(first * 3, first * 3 + 3)),
            );
            const end = viewport.projectPosition(
                Array.from(mesh.positions.subarray(second * 3, second * 3 + 3)),
            );
            for (let axis = 0; axis < 3; axis += 1) {
                commonPosition[axis] += (start[axis] + weight * (end[axis] - start[axis])) / 2;
            }
        }
        addLabel(
            {
                position: viewport.unprojectPosition(commonPosition),
                text: candidate.text,
                value: candidate.value,
            },
            commonPosition,
        );
    }
    return labels;
}
