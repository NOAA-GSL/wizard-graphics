export default class TriangulateGrid {
    static triangulate(grid, type, dims, size = 1, elevation = 0, scale = 1) {
        const regCols = dims[0];
        const regRows = dims[1];

        const cenRows = regRows - 1;
        const cenCols = regCols - 1;

        function getEmptyArray() {
            // Points for regular grid + points for centered grid
            // The regular grid takes up the first regRows*regCols points
            // while the centered grid takes up the next cenRows*cenCols points
            return new Float32Array(regRows * regCols * size + cenRows * cenCols * size);
        }

        // This doesn't populate if just loading data
        let arr;
        let k;
        let triangleIndices = [];

        function getIdx(i, j, localSize) {
            return (j * regRows + i) * localSize;
        }
        function getIdxCenter(i, j, localSize) {
            return (regRows * regCols + j * cenRows + i) * localSize;
        }

        switch (type) {
            // Since data is called every timestep, I broke it out into two
            // different cases.  This allows us to make the data case very fast
            // and avoid a bunch of if statements
            case 'data':
                arr = getEmptyArray();
                // Loop over the regular grid
                for (let j = 0; j < regCols; j += 1) {
                    for (let i = 0; i < regRows; i += 1) {
                        // load regular grid
                        const idx = getIdx(i, j, 1);
                        arr[idx] = grid[idx] * scale;

                        // load centered grid except for the last row and last column
                        // since we don't have centered point here
                        if (j !== regCols - 1 && i !== regRows - 1) {
                            const idx0 = getIdxCenter(i, j, 1);
                            const idx1 = getIdx(i, j, 1);
                            const idx2 = getIdx(i + 1, j, 1);
                            const idx3 = getIdx(i, j + 1, 1);
                            const idx4 = getIdx(i + 1, j + 1, 1);
                            arr[idx0] =
                                0.25 * (grid[idx1] + grid[idx2] + grid[idx3] + grid[idx4]) * scale;
                        }
                    }
                }

                return arr;

            case 'positions':
                // Loop over the regular grid
                arr = getEmptyArray();
                for (let j = 0; j < regCols; j += 1) {
                    for (let i = 0; i < regRows; i += 1) {
                        // load regular grid
                        const idx = getIdx(i, j, 3);
                        [arr[idx], arr[idx + 1]] = grid[j][i];
                        arr[idx + 2] = elevation;

                        // load centered grid except for the last row and last column
                        // since we don't have centered point here
                        if (j !== regCols - 1 && i !== regRows - 1) {
                            const idx0 = getIdxCenter(i, j, 3);
                            arr[idx0] =
                                0.25 *
                                (grid[j][i][0] +
                                    grid[j][i + 1][0] +
                                    grid[j + 1][i][0] +
                                    grid[j + 1][i + 1][0]);
                            arr[idx0 + 1] =
                                0.25 *
                                (grid[j][i][1] +
                                    grid[j][i + 1][1] +
                                    grid[j + 1][i][1] +
                                    grid[j + 1][i + 1][1]);
                            arr[idx0 + 2] = elevation;

                            // return the triangleIndices
                            //   p1--------p2
                            //   |          |
                            //   |----p5----|
                            //   |          |
                            //   p3--------p4
                            const p1 = getIdx(i, j, 1);
                            const p2 = getIdx(i + 1, j, 1);
                            const p3 = getIdx(i, j + 1, 1);
                            const p4 = getIdx(i + 1, j + 1, 1);
                            const p5 = getIdxCenter(i, j, 1);
                            triangleIndices.push(p1, p2, p5, p2, p4, p5, p4, p3, p5, p3, p1, p5);
                        }
                    }
                }
                triangleIndices = new Uint32Array(triangleIndices);

                return [arr, triangleIndices];

            // Positions-redudant will make position for every triangle.  There is some redundency
            // here and certainly not as fast as the 'positions' case.  However, It does allow for
            // consistent mapping of the r-g-b triangles used in the paintball plots
            case 'positions-redundant': {
                arr = [];
                let rgbData = [];
                k = 0;
                // Loop over the regular grid
                for (let j = 0; j < regCols - 1; j += 1) {
                    for (let i = 0; i < regRows - 1; i += 1) {
                        //   p1--------p2
                        //   |          |
                        //   |----------|
                        //   |          |
                        //   p3--------p4
                        //
                        // make a square with four trianges (need 4 points)
                        const pt1 = [grid[j][i][0], grid[j][i][1], elevation]; // top left
                        const pt2 = [grid[j][i + 1][0], grid[j][i + 1][1], elevation]; // top right
                        const pt3 = [grid[j + 1][i][0], grid[j + 1][i][1], elevation]; // bottom left
                        const pt4 = [grid[j + 1][i + 1][0], grid[j + 1][i + 1][1], elevation]; // bottom right

                        // Make 4 triangles
                        arr.push(...pt1, ...pt2, ...pt3, ...pt2, ...pt4, ...pt3);
                        rgbData.push(1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1);
                        triangleIndices.push(k, k + 1, k + 2, k + 3, k + 4, k + 5);
                        k += 6;
                    }
                }

                rgbData = new Float32Array(rgbData);
                arr = new Float32Array(arr);
                triangleIndices = new Uint32Array(triangleIndices);

                return [arr, triangleIndices, rgbData];
            }

            case 'data-redundant': {
                const step = 6;
                const length = (regCols - 1) * (regRows - 1) * step;
                const v1 = new Float32Array(length);
                const v2 = new Float32Array(length);
                const v3 = new Float32Array(length);

                k = 0;
                for (let j = 0; j < regCols - 1; j += 1) {
                    for (let i = 0; i < regRows - 1; i += 1) {
                        //
                        //   p1--------p2
                        //   |          |
                        //   |----------|
                        //   |          |
                        //   p3--------p4
                        //
                        // Grab data array
                        const idx1 = getIdx(i, j, 1);
                        const idx2 = getIdx(i + 1, j, 1);
                        const idx3 = getIdx(i, j + 1, 1);
                        const idx4 = getIdx(i + 1, j + 1, 1);
                        const d1 = grid[idx1];
                        const d2 = grid[idx2];
                        const d3 = grid[idx3];
                        const d4 = grid[idx4];

                        // v1 is the red points
                        v1[k + 0] = d1;
                        v1[k + 1] = d1;
                        v1[k + 2] = d1;
                        v1[k + 3] = d2;
                        v1[k + 4] = d2;
                        v1[k + 5] = d2;

                        // v2 is green
                        v2[k + 0] = d2;
                        v2[k + 1] = d2;
                        v2[k + 2] = d2;
                        v2[k + 3] = d4;
                        v2[k + 4] = d4;
                        v2[k + 5] = d4;

                        // v3 is blue
                        v3[k + 0] = d3;
                        v3[k + 1] = d3;
                        v3[k + 2] = d3;
                        v3[k + 3] = d3;
                        v3[k + 4] = d3;
                        v3[k + 5] = d3;

                        // This is slower
                        // v1.set([d1,d1,d1, d2,d2,d2], k);
                        // v2.set([d2,d2,d2, d4,d4,d4], k);
                        // v3.set([d3,d3,d3, d3,d3,d3], k);

                        // This is slowest!
                        // v1.push(d1,d1,d1, d2,d2,d2)
                        // v2.push(d2,d2,d2, d4,d4,d4)
                        // v3.push(d3,d3,d3, d3,d3,d3)

                        k += step;
                    }
                }

                return [v1, v2, v3];
            }

            default:
                console.log('cannot find case');
                break;
        }

        // Default return value if no case matches
        return null;
    }
}
