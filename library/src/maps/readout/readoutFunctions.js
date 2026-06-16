import gUtilities from "../../utilities/graphicsUtilities";

function findNearestIndexFlat(lon, lat, lonlatGrid) {
    if (!Array.isArray(lonlatGrid) || lonlatGrid.length === 0) return -1;

    let bestIndex = -1;
    let bestD2 = Infinity;
    for (let i = 0; i < lonlatGrid.length; i++) {
        const p = lonlatGrid[i];
        if (!Array.isArray(p) || p.length < 2) continue;
        const dLon = p[0] - lon;
        const dLat = p[1] - lat;
        const d2 = dLon * dLon + dLat * dLat;
        if (d2 < bestD2) {
            bestD2 = d2;
            bestIndex = i;
        }
    }

    return bestIndex;
}

function getStructuredPoint(lonlatGrid, rows, cols, r, c, wrapRows = false) {
    if (!Array.isArray(lonlatGrid) || lonlatGrid.length < rows * cols) return null;
    if (c < 0 || c >= cols) return null;

    let row = r;
    if (wrapRows) {
        row %= rows;
        if (row < 0) row += rows;
    }

    if (row < 0 || row >= rows) return null;
    return lonlatGrid[row * cols + c];
}

function averagePoints(points) {
    let lonSum = 0;
    let latSum = 0;
    let count = 0;

    for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        if (!Array.isArray(p) || p.length < 2) continue;
        const lon = p[0];
        const lat = p[1];
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        lonSum += lon;
        latSum += lat;
        count += 1;
    }

    if (count === 0) return null;
    return [lonSum / count, latSum / count];
}

function pointInTriangle(px, py, a, b, c) {
    const v0x = c[0] - a[0];
    const v0y = c[1] - a[1];
    const v1x = b[0] - a[0];
    const v1y = b[1] - a[1];
    const v2x = px - a[0];
    const v2y = py - a[1];

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const denom = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(denom) < 1e-15) return false;

    const invDenom = 1 / denom;
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9;
}

function barycentricInterpolate(px, py, a, b, c, va, vb, vc) {
    const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(det) < 1e-15) return NaN;

    const w1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / det;
    const w2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / det;
    const w3 = 1 - w1 - w2;

    return w1 * va + w2 * vb + w3 * vc;
}

function interpolateCorners(p1, p2, p3, p4, iWeight, iWeight2, jWeight, jWeight2, interpolate) {
    const values = [p3, p1, p4, p2];

    if (values.some((v) => Number.isNaN(v) || v == null)) {
        return NaN;
    }

    if (interpolate) {
        return (
            p3 * iWeight * jWeight +
            p1 * iWeight * jWeight2 +
            p4 * iWeight2 * jWeight +
            p2 * iWeight2 * jWeight2
        );
    }

    const weights = [
        iWeight * jWeight,
        iWeight * jWeight2,
        iWeight2 * jWeight,
        iWeight2 * jWeight2,
    ];
    const maxWeight = Math.max(...weights);
    const maxIndex = weights.indexOf(maxWeight);
    return values[maxIndex];
}

function directionToUV(dir, mag) {
    const rad = (dir * Math.PI) / 180;
    const u = -mag * Math.sin(rad);
    const v = -mag * Math.cos(rad);
    return [u, v];
}

function uvToDirection(u, v) {
    return 180 + (180 / Math.PI) * Math.atan2(u, v);
}

export default function readoutFunction(lat,lon,data,options = {}){
    let value;
    if (options.readoutType === 'gridded') value = griddedReadout(lat, lon, data, options);
    else if (options.readoutType === 'spherical') value = sphericalReadout(lat, lon, data, options);
    else if (options.readoutType === 'unstructured') value = unstructuredReadout(lat, lon, data, options);

    if ( Number.isNaN(value) )
        value = 'NaN';
    else
        value = gUtilities.roundto(value, options.decimals);
    
    value = `${options.prependText}: ${value}${options.units}`;
    return value
}

export function griddedReadout(lat, lon, data, options = {}) {
    const { projection, dataType = 'scalar', interpolate = true } = options;
    if (!projection || !data) return NaN;

    const [i, j] = projection.LonLatToij(lon, lat, false, true);

    const iFloor = Math.floor(i);
    const iCeiling = Math.ceil(i);
    const jFloor = Math.floor(j);
    const jCeiling = Math.ceil(j);

    const iWeight = 1 - (i - iFloor);
    const iWeight2 = 1 - iWeight;
    const jWeight = 1 - (j - jFloor);
    const jWeight2 = 1 - jWeight;

    const dims = [projection.lonlatGrid.length, projection.lonlatGrid[0].length];
    const width = dims[1];
    const height = dims[0];

    const idx = (ii, jj) => {
        if (ii < 0 || ii >= width || jj < 0 || jj >= height) return NaN;
        return jj * width + ii;
    };

    const p1 = data[idx(iFloor, jCeiling)];
    const p2 = data[idx(iCeiling, jCeiling)];
    const p3 = data[idx(iFloor, jFloor)];
    const p4 = data[idx(iCeiling, jFloor)];

    if (dataType === 'vector') {
        const [p1u, p1v] = directionToUV(p1, 1);
        const [p2u, p2v] = directionToUV(p2, 1);
        const [p3u, p3v] = directionToUV(p3, 1);
        const [p4u, p4v] = directionToUV(p4, 1);

        const uValue = interpolateCorners(
            p1u,
            p2u,
            p3u,
            p4u,
            iWeight,
            iWeight2,
            jWeight,
            jWeight2,
            interpolate,
        );
        const vValue = interpolateCorners(
            p1v,
            p2v,
            p3v,
            p4v,
            iWeight,
            iWeight2,
            jWeight,
            jWeight2,
            interpolate,
        );

        return Number.isNaN(uValue) || Number.isNaN(vValue) ? NaN : uvToDirection(uValue, vValue);
    }

    return interpolateCorners(p1, p2, p3, p4, iWeight, iWeight2, jWeight, jWeight2, interpolate);
}

export function sphericalReadout(lat, lon, data, options = {}) {
    const { lonlatGrid, shape, triangulationMode, interpolate = true } = options;
    if (!data || !lonlatGrid) return NaN;

    const dims =
        Array.isArray(shape) && Number.isFinite(shape[0]) && Number.isFinite(shape[1])
            ? [Math.floor(shape[0]), Math.floor(shape[1])]
            : null;

    if (!dims || dims[0] < 2 || dims[1] < 2) {
        const idx = findNearestIndexFlat(lon, lat, lonlatGrid);
        return idx >= 0 ? data[idx] : NaN;
    }

    const [rows, cols] = dims;

    // Cell mode: value is one per center point/cell. Prefer exact cell hit test.
    if (triangulationMode === 'spherical-cells') {
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const center = getStructuredPoint(lonlatGrid, rows, cols, r, c, false);
                const sw = averagePoints([
                    center,
                    getStructuredPoint(lonlatGrid, rows, cols, r, c - 1, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r - 1, c, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r - 1, c - 1, false),
                ]);
                const se = averagePoints([
                    center,
                    getStructuredPoint(lonlatGrid, rows, cols, r, c + 1, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r - 1, c, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r - 1, c + 1, false),
                ]);
                const ne = averagePoints([
                    center,
                    getStructuredPoint(lonlatGrid, rows, cols, r, c + 1, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r + 1, c, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r + 1, c + 1, false),
                ]);
                const nw = averagePoints([
                    center,
                    getStructuredPoint(lonlatGrid, rows, cols, r, c - 1, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r + 1, c, false),
                    getStructuredPoint(lonlatGrid, rows, cols, r + 1, c - 1, false),
                ]);

                if (!sw || !se || !ne || !nw) continue;

                const inside =
                    pointInTriangle(lon, lat, sw, se, ne) || pointInTriangle(lon, lat, sw, ne, nw);
                if (inside) {
                    const idx = r * cols + c;
                    return idx >= 0 && idx < data.length ? data[idx] : NaN;
                }
            }
        }

        const fallback = findNearestIndexFlat(lon, lat, lonlatGrid);
        return fallback >= 0 ? data[fallback] : NaN;
    }

    // Spherical mode: rows wrap azimuthally; cells are between c and c+1.
    // If interpolation is requested, mimic center-split triangle interpolation.
    for (let r = 0; r < rows; r += 1) {
        const rNext = (r + 1) % rows;
        for (let c = 0; c < cols - 1; c += 1) {
            const i00 = r * cols + c;
            const i10 = i00 + 1;
            const i01 = rNext * cols + c;
            const i11 = i01 + 1;

            const p00 = lonlatGrid[i00];
            const p10 = lonlatGrid[i10];
            const p01 = lonlatGrid[i01];
            const p11 = lonlatGrid[i11];
            if (!p00 || !p10 || !p01 || !p11) continue;

            const inside =
                pointInTriangle(lon, lat, p00, p10, p11) ||
                pointInTriangle(lon, lat, p00, p11, p01);
            if (!inside) continue;

            const v00 = data[i00];
            const v10 = data[i10];
            const v01 = data[i01];
            const v11 = data[i11];

            if (!interpolate) {
                const corners = [p00, p10, p11, p01];
                const values = [v00, v10, v11, v01];
                let bestIdx = -1;
                let bestD2 = Infinity;
                for (let k = 0; k < corners.length; k += 1) {
                    const dLon = corners[k][0] - lon;
                    const dLat = corners[k][1] - lat;
                    const d2 = dLon * dLon + dLat * dLat;
                    if (d2 < bestD2) {
                        bestD2 = d2;
                        bestIdx = k;
                    }
                }
                return values[bestIdx];
            }

            const center = averagePoints([p00, p10, p01, p11]);
            if (!center) return NaN;

            let sum = 0;
            let count = 0;
            const cornerValues = [v00, v10, v01, v11];
            for (let k = 0; k < cornerValues.length; k += 1) {
                if (Number.isFinite(cornerValues[k])) {
                    sum += cornerValues[k];
                    count += 1;
                }
            }
            const vc = count > 0 ? sum / count : NaN;
            if (!Number.isFinite(vc)) return NaN;

            const triangles = [
                [p00, center, p10, v00, vc, v10],
                [p10, center, p11, v10, vc, v11],
                [p11, center, p01, v11, vc, v01],
                [p01, center, p00, v01, vc, v00],
            ];

            for (let t = 0; t < triangles.length; t += 1) {
                const [a, b, cpt, va, vb, vcTri] = triangles[t];
                if (pointInTriangle(lon, lat, a, b, cpt)) {
                    if (!Number.isFinite(va) || !Number.isFinite(vb) || !Number.isFinite(vcTri)) {
                        return NaN;
                    }
                    return barycentricInterpolate(lon, lat, a, b, cpt, va, vb, vcTri);
                }
            }

            return vc;
        }
    }

    const idx = findNearestIndexFlat(lon, lat, lonlatGrid);
    return idx >= 0 ? data[idx] : NaN;
}

export function unstructuredReadout(lat, lon, data, options = {}) {
    const { lonlatGrid } = options;
    if (!data || !lonlatGrid) return NaN;

    const idx = findNearestIndexFlat(lon, lat, lonlatGrid);
    return idx >= 0 ? data[idx] : NaN;
}
