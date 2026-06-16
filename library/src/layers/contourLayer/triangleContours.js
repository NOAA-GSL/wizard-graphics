import TriangulateGrid from '../shadedLayer/TriangulateGrid';

function computeBounds(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
            const [x, y] = p;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxY)
    ) {
        return null;
    }

    return { minX, maxX, minY, maxY };
}

function pointKey(point, tolX, tolY) {
    const qx = Math.round(point[0] / tolX);
    const qy = Math.round(point[1] / tolY);
    return `${qx}:${qy}`;
}

function interpolateEdge(a, b, va, vb, level) {
    if (!Number.isFinite(va) || !Number.isFinite(vb)) {
        return null;
    }

    if ((va < level && vb < level) || (va > level && vb > level)) {
        return null;
    }

    const dv = vb - va;
    if (Math.abs(dv) < 1e-15) {
        return null;
    }

    const t = (level - va) / dv;
    if (t < 0 || t > 1) {
        return null;
    }

    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

function uniquePoints(points) {
    const out = [];
    const eps = 1e-12;

    for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        let exists = false;
        for (let j = 0; j < out.length; j += 1) {
            const q = out[j];
            if (Math.abs(p[0] - q[0]) <= eps && Math.abs(p[1] - q[1]) <= eps) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            out.push(p);
        }
    }

    return out;
}

function stitchSegments(segments, bounds) {
    if (!segments || segments.length === 0) {
        return [];
    }

    const dx = Math.max(1e-12, bounds.maxX - bounds.minX);
    const dy = Math.max(1e-12, bounds.maxY - bounds.minY);
    const tolX = dx * 1e-6;
    const tolY = dy * 1e-6;

    const nodes = new Map();
    const edges = [];

    function getNode(key, point) {
        let node = nodes.get(key);
        if (!node) {
            node = { point, edges: [] };
            nodes.set(key, node);
        }
        return node;
    }

    for (let i = 0; i < segments.length; i += 1) {
        const [a, b] = segments[i];
        const aKey = pointKey(a, tolX, tolY);
        const bKey = pointKey(b, tolX, tolY);

        if (aKey !== bKey) {
            const edgeId = edges.length;
            edges.push({ aKey, bKey, used: false });
            getNode(aKey, a).edges.push(edgeId);
            getNode(bKey, b).edges.push(edgeId);
        }
    }

    function otherKey(edge, key) {
        return edge.aKey === key ? edge.bKey : edge.aKey;
    }

    function trace(startKey, firstEdgeId) {
        const line = [nodes.get(startKey).point];
        let currentKey = startKey;
        let edgeId = firstEdgeId;

        while (edgeId != null) {
            const edge = edges[edgeId];
            if (edge.used) {
                break;
            }
            edge.used = true;

            const nextKey = otherKey(edge, currentKey);
            line.push(nodes.get(nextKey).point);

            const nextNode = nodes.get(nextKey);
            let nextEdgeId = null;
            for (let i = 0; i < nextNode.edges.length; i += 1) {
                const candidate = nextNode.edges[i];
                if (!edges[candidate].used) {
                    nextEdgeId = candidate;
                    break;
                }
            }

            currentKey = nextKey;
            edgeId = nextEdgeId;
        }

        return line;
    }

    const lines = [];
    for (const [key, node] of nodes.entries()) {
        if (node.edges.length !== 2) {
            for (let i = 0; i < node.edges.length; i += 1) {
                const edgeId = node.edges[i];
                if (!edges[edgeId].used) {
                    lines.push(trace(key, edgeId));
                }
            }
        }
    }

    for (const [key, node] of nodes.entries()) {
        for (let i = 0; i < node.edges.length; i += 1) {
            const edgeId = node.edges[i];
            if (!edges[edgeId].used) {
                lines.push(trace(key, edgeId));
            }
        }
    }

    return lines.filter((line) => line.length > 1);
}

export default function triangleContours(lonlatGrid, values, levels, shape = null) {
    const points = lonlatGrid;
    const flattenedValues = values;

    const pairCount = Math.min(points.length, flattenedValues.length);
    const validPoints = [];
    const validValues = [];
    for (let i = 0; i < pairCount; i += 1) {
        const point = points[i];
        if (point && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
            validPoints.push(point);
            validValues.push(flattenedValues[i]);
        }
    }

    const count = validPoints.length;

    if (count < 3) {
        return { type: 'FeatureCollection', features: [] };
    }

    const levelsArray = (levels || []).filter((level) => Number.isFinite(level));
    if (levelsArray.length === 0) {
        return { type: 'FeatureCollection', features: [] };
    }

    const [vertices, indices] = TriangulateGrid.triangulate(
        validPoints,
        'positions',
        null,
        3,
        0,
        1,
        'delaunay',
    );

    if (!indices || indices.length < 3) {
        return { type: 'FeatureCollection', features: [] };
    }

    const coords = new Array(vertices.length / 3);
    for (let i = 0; i < coords.length; i += 1) {
        const base = i * 3;
        coords[i] = [vertices[base], vertices[base + 1]];
    }

    const bounds = computeBounds(validPoints);
    if (!bounds) {
        return { type: 'FeatureCollection', features: [] };
    }

    const features = [];

    for (let li = 0; li < levelsArray.length; li += 1) {
        const level = levelsArray[li];
        const segments = [];

        for (let i = 0; i < indices.length; i += 3) {
            const ia = indices[i];
            const ib = indices[i + 1];
            const ic = indices[i + 2];

            if (ia < count && ib < count && ic < count) {
                const va = validValues[ia];
                const vb = validValues[ib];
                const vc = validValues[ic];

                if (Number.isFinite(va) && Number.isFinite(vb) && Number.isFinite(vc)) {
                    const a = coords[ia];
                    const b = coords[ib];
                    const c = coords[ic];

                    const intersections = uniquePoints(
                        [
                            interpolateEdge(a, b, va, vb, level),
                            interpolateEdge(b, c, vb, vc, level),
                            interpolateEdge(c, a, vc, va, level),
                        ].filter(Boolean),
                    );

                    if (intersections.length >= 2) {
                        segments.push([intersections[0], intersections[1]]);
                    }
                }
            }
        }

        const lines = stitchSegments(segments, bounds);
        if (lines.length > 0) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'MultiLineString',
                    coordinates: lines,
                },
                properties: [{ value: level }],
            });
        }
    }

    return {
        type: 'FeatureCollection',
        features,
    };
}
