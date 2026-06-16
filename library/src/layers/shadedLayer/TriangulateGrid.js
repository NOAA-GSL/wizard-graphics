import earcut from 'earcut';
// eslint-disable-next-line import/no-extraneous-dependencies
import Delaunator from 'delaunator';

export default class TriangulateGrid {
    static inferRadarDims(points) {
        if (!Array.isArray(points) || points.length < 64) {
            return null;
        }

        const distances = [];
        for (let i = 1; i < points.length; i += 1) {
            const a = points[i - 1];
            const b = points[i];
            if (
                Array.isArray(a) &&
                Array.isArray(b) &&
                Number.isFinite(a[0]) &&
                Number.isFinite(a[1]) &&
                Number.isFinite(b[0]) &&
                Number.isFinite(b[1])
            ) {
                const dx = b[0] - a[0];
                const dy = b[1] - a[1];
                const d = Math.sqrt(dx * dx + dy * dy);
                if (Number.isFinite(d) && d > 0) {
                    distances.push(d);
                }
            }
        }

        if (distances.length < 16) {
            return null;
        }

        const sorted = distances.slice().sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length * 0.5)] || 0;
        if (!(median > 0)) {
            return null;
        }

        const jumpThreshold = median * 8;
        const rowStarts = [0];
        for (let i = 1; i < points.length; i += 1) {
            const a = points[i - 1];
            const b = points[i];
            if (
                Array.isArray(a) &&
                Array.isArray(b) &&
                Number.isFinite(a[0]) &&
                Number.isFinite(a[1]) &&
                Number.isFinite(b[0]) &&
                Number.isFinite(b[1])
            ) {
                const dx = b[0] - a[0];
                const dy = b[1] - a[1];
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > jumpThreshold) {
                    rowStarts.push(i);
                }
            }
        }

        if (rowStarts.length < 8) {
            return null;
        }

        let minCols = Infinity;
        for (let r = 0; r < rowStarts.length; r += 1) {
            const start = rowStarts[r];
            const end = r + 1 < rowStarts.length ? rowStarts[r + 1] : points.length;
            const len = end - start;
            if (len < minCols) {
                minCols = len;
            }
        }

        if (!(minCols >= 8)) {
            return null;
        }

        return [rowStarts.length, minCols];
    }

    static buildRadarCellGeometry(points, dims, size = 3, elevation = 0) {
        const [rows, cols] = dims;
        const pointCount = rows * cols;
        if (rows < 2 || cols < 2 || !Array.isArray(points) || points.length < pointCount) {
            return null;
        }

        const cellCount = rows * (cols - 1);
        const verticesPerCell = 4;
        const vertices = new Float32Array(cellCount * verticesPerCell * size);
        const indices = new Uint32Array(cellCount * 6);

        let vw = 0;
        let iw = 0;
        let baseVertex = 0;

        for (let r = 0; r < rows; r += 1) {
            const rNext = (r + 1) % rows;
            for (let c = 0; c < cols; c += 1) {
                if (c >= cols - 1) {
                    continue;
                }
                const i00 = r * cols + c;
                const i01 = i00 + 1;
                const i10 = rNext * cols + c;
                const i11 = i10 + 1;

                const p00 = points[i00];
                const p01 = points[i01];
                const p10 = points[i10];
                const p11 = points[i11];

                const sw = Array.isArray(p00) ? p00 : [0, 0];
                const se = Array.isArray(p01) ? p01 : [0, 0];
                const nw = Array.isArray(p10) ? p10 : [0, 0];
                const ne = Array.isArray(p11) ? p11 : [0, 0];

                // lower-left
                vertices[vw] = Number.isFinite(sw[0]) ? sw[0] : 0;
                vertices[vw + 1] = Number.isFinite(sw[1]) ? sw[1] : 0;
                vertices[vw + 2] = elevation;
                // lower-right
                vertices[vw + 3] = Number.isFinite(se[0]) ? se[0] : 0;
                vertices[vw + 4] = Number.isFinite(se[1]) ? se[1] : 0;
                vertices[vw + 5] = elevation;
                // upper-right
                vertices[vw + 6] = Number.isFinite(ne[0]) ? ne[0] : 0;
                vertices[vw + 7] = Number.isFinite(ne[1]) ? ne[1] : 0;
                vertices[vw + 8] = elevation;
                // upper-left
                vertices[vw + 9] = Number.isFinite(nw[0]) ? nw[0] : 0;
                vertices[vw + 10] = Number.isFinite(nw[1]) ? nw[1] : 0;
                vertices[vw + 11] = elevation;

                indices[iw] = baseVertex;
                indices[iw + 1] = baseVertex + 2;
                indices[iw + 2] = baseVertex + 1;
                indices[iw + 3] = baseVertex;
                indices[iw + 4] = baseVertex + 3;
                indices[iw + 5] = baseVertex + 2;

                vw += verticesPerCell * size;
                iw += 6;
                baseVertex += verticesPerCell;
            }
        }

        return [vertices, indices];
    }

    static buildSphericalQuadCenterGeometry(points, dims, size = 3, elevation = 0) {
        const [rows, cols] = dims;
        const pointCount = rows * cols;
        if (rows < 2 || cols < 2 || !Array.isArray(points) || points.length < pointCount) {
            return null;
        }

        const centerCount = rows * (cols - 1);
        const vertices = new Float32Array((pointCount + centerCount) * size);
        const indices = new Uint32Array(centerCount * 12);

        for (let i = 0; i < pointCount; i += 1) {
            const idx = i * size;
            const point = points[i];
            const lon = Array.isArray(point) && Number.isFinite(point[0]) ? point[0] : 0;
            const lat = Array.isArray(point) && Number.isFinite(point[1]) ? point[1] : 0;
            vertices[idx] = lon;
            vertices[idx + 1] = lat;
            vertices[idx + 2] = elevation;
        }

        let centerVertex = pointCount;
        let w = 0;
        for (let r = 0; r < rows; r += 1) {
            const rNext = (r + 1) % rows;
            for (let c = 0; c < cols - 1; c += 1) {
                const i00 = r * cols + c;
                const i10 = i00 + 1;
                const i01 = rNext * cols + c;
                const i11 = i01 + 1;

                const p00 = points[i00];
                const p10 = points[i10];
                const p01 = points[i01];
                const p11 = points[i11];

                const cidx = centerVertex * size;
                const lon00 = Array.isArray(p00) && Number.isFinite(p00[0]) ? p00[0] : 0;
                const lat00 = Array.isArray(p00) && Number.isFinite(p00[1]) ? p00[1] : 0;
                const lon10 = Array.isArray(p10) && Number.isFinite(p10[0]) ? p10[0] : 0;
                const lat10 = Array.isArray(p10) && Number.isFinite(p10[1]) ? p10[1] : 0;
                const lon01 = Array.isArray(p01) && Number.isFinite(p01[0]) ? p01[0] : 0;
                const lat01 = Array.isArray(p01) && Number.isFinite(p01[1]) ? p01[1] : 0;
                const lon11 = Array.isArray(p11) && Number.isFinite(p11[0]) ? p11[0] : 0;
                const lat11 = Array.isArray(p11) && Number.isFinite(p11[1]) ? p11[1] : 0;

                vertices[cidx] = (lon00 + lon10 + lon01 + lon11) * 0.25;
                vertices[cidx + 1] = (lat00 + lat10 + lat01 + lat11) * 0.25;
                vertices[cidx + 2] = elevation;

                indices[w] = i00;
                indices[w + 1] = centerVertex;
                indices[w + 2] = i10;
                indices[w + 3] = i10;
                indices[w + 4] = centerVertex;
                indices[w + 5] = i11;
                indices[w + 6] = i11;
                indices[w + 7] = centerVertex;
                indices[w + 8] = i01;
                indices[w + 9] = i01;
                indices[w + 10] = centerVertex;
                indices[w + 11] = i00;

                w += 12;
                centerVertex += 1;
            }
        }

        return [vertices, indices];
    }

    static compute1dBoundaries(centers) {
        const n = centers.length;
        const bounds = new Float64Array(n + 1);

        if (n === 0) {
            return bounds;
        }

        if (n === 1) {
            bounds[0] = centers[0] - 0.5;
            bounds[1] = centers[0] + 0.5;
            return bounds;
        }

        bounds[0] = centers[0] - (centers[1] - centers[0]) * 0.5;
        for (let i = 1; i < n; i += 1) {
            bounds[i] = (centers[i - 1] + centers[i]) * 0.5;
        }
        bounds[n] = centers[n - 1] + (centers[n - 1] - centers[n - 2]) * 0.5;

        return bounds;
    }

    static midpointBoundary(prev, curr, next) {
        if (prev != null && next != null) {
            return [(prev + curr) * 0.5, (curr + next) * 0.5];
        }
        if (next != null) {
            const halfStep = (next - curr) * 0.5;
            return [curr - halfStep, curr + halfStep];
        }
        if (prev != null) {
            const halfStep = (curr - prev) * 0.5;
            return [curr - halfStep, curr + halfStep];
        }
        return [curr - 0.5, curr + 0.5];
    }

    static buildGridCellGeometry(points, dims, size = 3, elevation = 0) {
        const [rows, cols] = dims;
        const cellCount = rows * cols;
        const verticesPerCell = 4;

        const getPoint = (r, c) => {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
            return points[r * cols + c];
        };

        const averagePoints = (plist) => {
            let lonSum = 0;
            let latSum = 0;
            let count = 0;
            for (let i = 0; i < plist.length; i += 1) {
                const p = plist[i];
                if (!Array.isArray(p)) continue;
                const lon = p[0];
                const lat = p[1];
                if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
                lonSum += lon;
                latSum += lat;
                count += 1;
            }
            if (count === 0) return [0, 0];
            return [lonSum / count, latSum / count];
        };

        const vertices = new Float32Array(cellCount * verticesPerCell * size);
        const indices = new Uint32Array(cellCount * 6);

        let vw = 0;
        let iw = 0;
        let baseVertex = 0;

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const center = getPoint(r, c);

                // Build each corner from the center and its quadrant neighbors.
                // Adjacent cells reuse the same point set for shared corners/walls.
                const [swLon, swLat] = averagePoints([
                    center,
                    getPoint(r, c - 1),
                    getPoint(r - 1, c),
                    getPoint(r - 1, c - 1),
                ]);
                const [seLon, seLat] = averagePoints([
                    center,
                    getPoint(r, c + 1),
                    getPoint(r - 1, c),
                    getPoint(r - 1, c + 1),
                ]);
                const [neLon, neLat] = averagePoints([
                    center,
                    getPoint(r, c + 1),
                    getPoint(r + 1, c),
                    getPoint(r + 1, c + 1),
                ]);
                const [nwLon, nwLat] = averagePoints([
                    center,
                    getPoint(r, c - 1),
                    getPoint(r + 1, c),
                    getPoint(r + 1, c - 1),
                ]);

                // lower-left
                vertices[vw] = swLon;
                vertices[vw + 1] = swLat;
                vertices[vw + 2] = elevation;
                // lower-right
                vertices[vw + 3] = seLon;
                vertices[vw + 4] = seLat;
                vertices[vw + 5] = elevation;
                // upper-right
                vertices[vw + 6] = neLon;
                vertices[vw + 7] = neLat;
                vertices[vw + 8] = elevation;
                // upper-left
                vertices[vw + 9] = nwLon;
                vertices[vw + 10] = nwLat;
                vertices[vw + 11] = elevation;

                // Two triangles per cell.
                indices[iw] = baseVertex;
                indices[iw + 1] = baseVertex + 1;
                indices[iw + 2] = baseVertex + 2;
                indices[iw + 3] = baseVertex;
                indices[iw + 4] = baseVertex + 2;
                indices[iw + 5] = baseVertex + 3;

                vw += verticesPerCell * size;
                iw += 6;
                baseVertex += verticesPerCell;
            }
        }

        return [vertices, indices];
    }

    static flattenStructuredPoints(grid, dims) {
        if (!dims || !Array.isArray(grid[0]) || !Array.isArray(grid[0][0])) {
            return grid;
        }

        const [rows, cols] = dims;
        const points = new Array(rows * cols);
        let k = 0;
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                points[k] = grid[r][c];
                k += 1;
            }
        }
        return points;
    }

    static flattenStructuredValues(grid, dims) {
        if (!dims || !Array.isArray(grid[0])) {
            return grid;
        }

        const [rows, cols] = dims;
        const values = new Float32Array(rows * cols);
        let k = 0;
        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                values[k] = grid[r][c];
                k += 1;
            }
        }
        return values;
    }

    static triangulate(
        grid,
        type,
        dims,
        size = 1,
        elevation = 0,
        scale = 1,
        triangulationMode = 'delaunay',
    ) {
        switch (type) {
            case 'data': {
                const values = Array.isArray(dims)
                    ? TriangulateGrid.flattenStructuredValues(grid, dims)
                    : grid;

                if (triangulationMode === 'spherical-cells' && Array.isArray(dims)) {
                    const [rows, cols] = dims;
                    const cellCount = rows * cols;
                    const verticesPerCell = 4;
                    const arr = new Float32Array(cellCount * verticesPerCell * size);
                    let w = 0;
                    for (let r = 0; r < rows; r += 1) {
                        for (let c = 0; c < cols; c += 1) {
                            const i00 = r * cols + c;
                            const value = Number.isFinite(values[i00]) ? values[i00] : NaN;
                            const scaledValue = value * scale;
                            arr[w] = scaledValue;
                            arr[w + 1] = scaledValue;
                            arr[w + 2] = scaledValue;
                            arr[w + 3] = scaledValue;
                            w += verticesPerCell;
                        }
                    }
                    return arr;
                }

                if (triangulationMode === 'spherical' && Array.isArray(dims)) {
                    const [rows, cols] = dims;
                    const pointCount = rows * cols;
                    const centerCount = rows * (cols - 1);
                    const arr = new Float32Array((pointCount + centerCount) * size);

                    for (let i = 0; i < pointCount; i += 1) {
                        const value = Number.isFinite(values[i]) ? values[i] : NaN;
                        arr[i] = value * scale;
                    }

                    let centerIndex = pointCount;
                    for (let r = 0; r < rows; r += 1) {
                        const rNext = (r + 1) % rows;
                        for (let c = 0; c < cols - 1; c += 1) {
                            const i00 = r * cols + c;
                            const i10 = i00 + 1;
                            const i01 = rNext * cols + c;
                            const i11 = i01 + 1;

                            const v00 = values[i00];
                            const v10 = values[i10];
                            const v01 = values[i01];
                            const v11 = values[i11];

                            let sum = 0;
                            let count = 0;
                            if (Number.isFinite(v00)) {
                                sum += v00;
                                count += 1;
                            }
                            if (Number.isFinite(v10)) {
                                sum += v10;
                                count += 1;
                            }
                            if (Number.isFinite(v01)) {
                                sum += v01;
                                count += 1;
                            }
                            if (Number.isFinite(v11)) {
                                sum += v11;
                                count += 1;
                            }

                            arr[centerIndex] = count > 0 ? (sum / count) * scale : NaN;
                            centerIndex += 1;
                        }
                    }

                    return arr;
                }

                if (triangulationMode === 'quadkey-cells' && Array.isArray(dims)) {
                    const verticesPerCell = 4;
                    const arr = new Float32Array(values.length * verticesPerCell * size);
                    let w = 0;
                    for (let i = 0; i < values.length; i += 1) {
                        const scaledValue = values[i] * scale;
                        arr[w] = scaledValue;
                        arr[w + 1] = scaledValue;
                        arr[w + 2] = scaledValue;
                        arr[w + 3] = scaledValue;
                        w += verticesPerCell;
                    }
                    return arr;
                }

                if (triangulationMode === 'quadkey' && Array.isArray(dims)) {
                    const [rows, cols] = dims;
                    const baseCount = rows * cols;
                    const centerCount = Math.max(0, (rows - 1) * (cols - 1));
                    const arr = new Float32Array((baseCount + centerCount) * size);

                    for (let i = 0; i < baseCount; i += 1) {
                        arr[i] = values[i] * scale;
                    }

                    let centerIndex = baseCount;
                    for (let r = 0; r < rows - 1; r += 1) {
                        for (let c = 0; c < cols - 1; c += 1) {
                            const i00 = r * cols + c;
                            const i10 = i00 + 1;
                            const i01 = (r + 1) * cols + c;
                            const i11 = i01 + 1;

                            arr[centerIndex] =
                                (values[i00] + values[i10] + values[i01] + values[i11]) *
                                0.25 *
                                scale;
                            centerIndex += 1;
                        }
                    }

                    return arr;
                }

                const arr = new Float32Array(values.length * size);
                for (let i = 0; i < values.length; i += 1) {
                    arr[i] = values[i] * scale;
                }
                return arr;
            }

            case 'positions': {
                const points = Array.isArray(dims)
                    ? TriangulateGrid.flattenStructuredPoints(grid, dims)
                    : grid;

                if (triangulationMode === 'spherical-cells' && Array.isArray(dims)) {
                    const radarGeometry = TriangulateGrid.buildGridCellGeometry(
                        points,
                        dims,
                        size,
                        elevation,
                    );
                    if (radarGeometry) {
                        const [vertices, baseIndices] = radarGeometry;
                        const indices = new Uint32Array(baseIndices.length);
                        for (let i = 0; i < baseIndices.length; i += 3) {
                            indices[i] = baseIndices[i];
                            indices[i + 1] = baseIndices[i + 2];
                            indices[i + 2] = baseIndices[i + 1];
                        }
                        return [vertices, indices];
                    }
                }

                if (triangulationMode === 'spherical' && Array.isArray(dims)) {
                    const sphericalGeometry = TriangulateGrid.buildSphericalQuadCenterGeometry(
                        points,
                        dims,
                        size,
                        elevation,
                    );
                    if (sphericalGeometry) {
                        return sphericalGeometry;
                    }
                }

                if (triangulationMode === 'quadkey-cells' && Array.isArray(dims)) {
                    return TriangulateGrid.buildGridCellGeometry(points, dims, size, elevation);
                }

                const baseCount = points.length;
                const hasStructuredDims = Array.isArray(dims);
                const [rows, cols] = hasStructuredDims ? dims : [0, 0];
                const centerCount =
                    triangulationMode === 'quadkey' && hasStructuredDims
                        ? Math.max(0, (rows - 1) * (cols - 1))
                        : 0;

                const arr = new Float32Array((baseCount + centerCount) * size);
                const flat = new Float32Array(baseCount * 2);

                for (let i = 0; i < points.length; i += 1) {
                    const idx = i * size;
                    const xy = i * 2;
                    const lon = points[i][0];
                    const lat = points[i][1];
                    arr[idx] = lon;
                    arr[idx + 1] = lat;
                    arr[idx + 2] = elevation;
                    flat[xy] = lon;
                    flat[xy + 1] = lat;
                }

                if (triangulationMode === 'quadkey' && hasStructuredDims) {
                    const indices = new Uint32Array((rows - 1) * (cols - 1) * 12);
                    let w = 0;
                    let centerVertex = rows * cols;

                    for (let r = 0; r < rows - 1; r += 1) {
                        for (let c = 0; c < cols - 1; c += 1) {
                            const i00 = r * cols + c;
                            const i10 = i00 + 1;
                            const i01 = (r + 1) * cols + c;
                            const i11 = i01 + 1;

                            const p00 = points[i00];
                            const p10 = points[i10];
                            const p01 = points[i01];
                            const p11 = points[i11];

                            const cidx = centerVertex * size;
                            arr[cidx] = (p00[0] + p10[0] + p01[0] + p11[0]) * 0.25;
                            arr[cidx + 1] = (p00[1] + p10[1] + p01[1] + p11[1]) * 0.25;
                            arr[cidx + 2] = elevation;

                            indices[w] = i00;
                            indices[w + 1] = i10;
                            indices[w + 2] = centerVertex;
                            indices[w + 3] = i10;
                            indices[w + 4] = i11;
                            indices[w + 5] = centerVertex;
                            indices[w + 6] = i11;
                            indices[w + 7] = i01;
                            indices[w + 8] = centerVertex;
                            indices[w + 9] = i01;
                            indices[w + 10] = i00;
                            indices[w + 11] = centerVertex;

                            w += 12;
                            centerVertex += 1;
                        }
                    }

                    return [arr, indices];
                }

                const useDelaunay =
                    triangulationMode === 'unstructured' ||
                    triangulationMode === 'spherical' ||
                    triangulationMode === 'spherical-cells' ||
                    triangulationMode === 'delaunay';

                const triangleIndices = useDelaunay
                    ? (() => {
                          const { triangles } = Delaunator.from(points);
                          const indices = new Uint32Array(triangles.length);
                          for (let i = 0; i < triangles.length; i += 3) {
                              // Deck/luma front-face setup here expects the opposite winding.
                              indices[i] = triangles[i];
                              indices[i + 1] = triangles[i + 2];
                              indices[i + 2] = triangles[i + 1];
                          }
                          return indices;
                      })()
                    : new Uint32Array(earcut(flat));
                return [arr, triangleIndices];
            }

            default:
                throw new Error(`Unsupported triangulation type: ${type}`);
        }
    }
}
