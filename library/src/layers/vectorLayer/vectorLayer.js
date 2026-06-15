/* eslint-disable max-len */
import { CompositeLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { CollisionFilterExtension } from '@deck.gl/extensions';
import barbsPNG from './barbs-new.png?url';
import deckUtilities from '../../utilities/deckUtilities';
import gUtilities from '../../utilities/graphicsUtilities';

//
// Constants for Korri's wind barbs
const clampNum = (x) => `barb${Math.floor(x / 5) * 5}`;
const ICON_MAPPING = {};
const IconRow = (x) => 4 - 1 - Math.floor((x + 2.5) / 50);
const IconCol = (x) => Math.floor(((x + 2.5) % 50.0) / 5.0);

for (let barbidx = 0; barbidx <= 175; barbidx += 5) {
    ICON_MAPPING[`barb${barbidx}`] = {
        x: IconCol(barbidx) * 100,
        y: IconRow(barbidx) * 100,
        width: 100,
        anchorY: 11,
        anchorX: 67,
        height: 100,
        mask: true,
    };
}

const defaultProps = {
    sizeScale: 25,
    elevation: 0,
    angleOffset: 0,
    billboard: false,
    getColor: (x) => x.color || [0, 0, 0, 255],
    getLabel: (x) => x.label,
    getWeight: (x) => x.weight || 1,
    getPosition: (x) => x.position,
    parameters: { depthCompare: 'always', cullMode: 'front' },
    // Sampling mode for vector rendering: 'quadkey' | 'unstructured' | 'spherical'
    triangulationMode: 'quadkey',
    // For gridded datasets, pass the shape as [rows, cols]
    shape: null,
    // Multiplier for barb spacing — larger values spread barbs further apart
    spacingScale: 1,
};

export default class VectorLayer extends CompositeLayer {
    initializeState() {
        this.state = {
            // Cached tags per zoom level
            zoom: 9999,
            data: [],
            bounds: null,
        };
    }

    // eslint-disable-next-line class-methods-use-this
    shouldUpdateState({ changeFlags }) {
        return changeFlags.somethingChanged;
    }

    updateState({ props, oldProps, changeFlags }) {
        super.updateState({ props, oldProps, changeFlags });
        const { viewport } = this.context;
        const { zoom } = viewport;
        const t0 = performance.now();

        const { yMin, yMax, xMin, xMax } = deckUtilities.getViewportBounds(viewport);
        const yRange = yMax - yMin;
        const xRange = xMax - xMin;
        const yBuffer = yRange * 0.3;
        const xBuffer = xRange * 0.3;

        // Only update the layer if propsOrDataChanged,
        // if zoom has changed by 0.5 or more,
        // or if the viewport has panned to the edge of the previously buffered render area.
        if (!changeFlags.propsOrDataChanged) {
            const prevBounds = this.state.bounds;
            const hitBufferEdge = prevBounds && (
                yMin < prevBounds.yMin ||
                yMax > prevBounds.yMax ||
                xMin < prevBounds.xMin ||
                xMax > prevBounds.xMax
            );
            if (!zoom || (Math.abs(zoom - this.state.zoom) < 0.5 && !hitBufferEdge)) return;
        }

        function wrapLongitude(lon) {
            return ((((lon + 180) % 360) + 360) % 360) - 180;
        }

        const { lonlatGrid, dataDir, dataMag, triangulationMode, shape } = props;
        // console.log('viewport bounds', { yMin, yMax, xMin, xMax });
        // console.log('ybuffer, xbuffer', { yBuffer, xBuffer });

        const sizeScale = props.sizeScale * zoom ** 0.25;
        const results = [];
        const mode = triangulationMode || 'quadkey';
        // Fast sampling for gridded data (quadkey / spherical) when shape is provided
        if (mode === 'quadkey' && Array.isArray(shape) && shape.length === 2) {
            const [ny, nx] = shape;

            const { latPerPixel, lonPerPixel } = deckUtilities.getLatLonPerPixel(viewport);

            // Use center of grid to estimate per-grid-degree spacing robustly
            const jlen = ny;
            const ilen = nx;
            const j0 = Math.floor(ny / 2);
            const i0 = Math.floor(nx / 2);
            const centerIdx = j0 * nx + i0;

            let latStep = NaN;
            let lonStep = NaN;
            const centerPt = lonlatGrid[centerIdx];
            if (centerPt && Array.isArray(centerPt)) {
                // Try to take neighbor differences around the center
                if (j0 < ny - 1) {
                    const down = lonlatGrid[(j0 + 1) * nx + i0];
                    if (down && Array.isArray(down)) latStep = Math.abs(down[1] - centerPt[1]);
                }
                if (!Number.isFinite(latStep) && j0 > 0) {
                    const up = lonlatGrid[(j0 - 1) * nx + i0];
                    if (up && Array.isArray(up)) latStep = Math.abs(centerPt[1] - up[1]);
                }

                if (i0 < nx - 1) {
                    const right = lonlatGrid[j0 * nx + (i0 + 1)];
                    if (right && Array.isArray(right)) lonStep = Math.abs(right[0] - centerPt[0]);
                }
                if (!Number.isFinite(lonStep) && i0 > 0) {
                    const left = lonlatGrid[j0 * nx + (i0 - 1)];
                    if (left && Array.isArray(left)) lonStep = Math.abs(centerPt[0] - left[0]);
                }
            }

            // Fallback to total extent if neighbor diffs failed or are zero
            if (!Number.isFinite(latStep) || latStep === 0) {
                const top = lonlatGrid[0];
                const bottom = lonlatGrid[(ny - 1) * nx + 0];
                if (top && bottom) latStep = Math.abs(bottom[1] - top[1]) / ny;
            }
            if (!Number.isFinite(lonStep) || lonStep === 0) {
                const leftmost = lonlatGrid[0];
                const rightmost = lonlatGrid[0 * nx + (nx - 1)];
                if (leftmost && rightmost) lonStep = Math.abs(rightmost[0] - leftmost[0]) / nx;
            }

            // Now compute barbs per degree (grid points per degree)
            const barbsPerLat = 1 / latStep;
            const barbsPerLon = 1 / lonStep;

            // Ideal spacing between barbs is 1.5 the length of a barb, scaled by spacingScale
            const idealSpacingPixelPerBarb = props.sizeScale * 1.5 * props.spacingScale;
            const xpixelPerBarb = 1 / (barbsPerLat * latPerPixel);
            const ypixelPerBarb = 1 / (barbsPerLon * lonPerPixel);
            const xInterval = Math.max(Math.round(idealSpacingPixelPerBarb / xpixelPerBarb), 1);
            const yInterval = Math.max(Math.round(idealSpacingPixelPerBarb / ypixelPerBarb), 1);

            const numy = Math.ceil(jlen / yInterval);
            const numx = Math.ceil(ilen / xInterval);
            for (let j = 0; j < jlen; j += yInterval) {
                for (let i = 0; i < ilen; i += xInterval) {
                    const idx = j * nx + i;
                    const p = lonlatGrid[idx];
                    const lon = p[0];
                    const lat = p[1];

                    const speed = dataMag[idx];
                    const direction = dataDir[idx];
                    if (
                        lat < yMin - yBuffer ||
                        lat > yMax + yBuffer ||
                        lon < xMin - xBuffer ||
                        lon > xMax + xBuffer
                    ) {
                        continue;
                    }
                    if (
                    !Number.isFinite(lon) ||
                    !Number.isFinite(lat) ||
                    !Number.isFinite(speed) ||
                    !Number.isFinite(direction)
                    )
                        continue;
                    results.push({
                        position: [lon, lat, props.elevation],
                        speed,
                        angle: -direction + 180 + props.angleOffset,
                    });
                }
            }
        } else {
            // Base pixel spacing. Use inverse scaling so spacing decreases when zooming in
            // (prevents sparser symbols at higher zooms).
            const paddingPx = 24 * props.spacingScale;
            const DEFAULT_ICON_SCALE = 25;
            const minPixelSpacing = Math.max(1, paddingPx * (DEFAULT_ICON_SCALE / sizeScale));
            // screen buffer (pixels) to avoid clipping at edges while zooming
            const bufferPx = Math.ceil(minPixelSpacing * 1.5);

            // Unstructured or fallback: project points and use a screen-space spatial hash to avoid collisions
            const cellSize = Math.max(1, minPixelSpacing);
            const cells = new Map();

            for (let idx = 0; idx < lonlatGrid.length; idx += 1) {
                const p = lonlatGrid[idx];
                if (!p || !Array.isArray(p) || p.length < 2) continue;
                const lon = p[0];
                const lat = p[1];
                const speed = dataMag[idx];
                const direction = dataDir[idx];

                if (
                    !Number.isFinite(lon) ||
                    !Number.isFinite(lat) ||
                    !Number.isFinite(speed) ||
                    !Number.isFinite(direction)
                )
                    continue;
                const wrappedLon = wrapLongitude(lon);
                const projected = viewport.project([wrappedLon, lat]);
                const px = projected[0];
                const py = projected[1];
                // console.log('projected', { lon, lat, wrappedLon, px, py });

                if (
                    px < -bufferPx ||
                    py < -bufferPx ||
                    px > viewport.width + bufferPx ||
                    py > viewport.height + bufferPx
                )
                    continue;

                const cellX = Math.floor(px / cellSize);
                const cellY = Math.floor(py / cellSize);
                let foundNearby = false;
                for (let dx = -1; dx <= 1 && !foundNearby; dx += 1) {
                    for (let dy = -1; dy <= 1 && !foundNearby; dy += 1) {
                        const key = `${cellX + dx}_${cellY + dy}`;
                        if (cells.has(key)) {
                            const existing = cells.get(key);
                            const dist = Math.hypot(existing[0] - px, existing[1] - py);
                            if (dist < minPixelSpacing) {
                                foundNearby = true;
                            }
                        }
                    }
                }
                if (!foundNearby) {
                    cells.set(`${cellX}_${cellY}`, [px, py]);
                    results.push({
                        position: [lon, lat, props.elevation],
                        speed,
                        angle: -direction + 180 + props.angleOffset,
                    });
                }
            }
        }

        console.log('vector layer: processed data in ', performance.now() - t0, 'ms');
        // console.log('lonlatGrid', lonlatGrid);
        // console.log('Number of barbs', results.length);
        // console.log('reulsts', results);
        this.setState({
            zoom,
            data: results,
            sizeScale,
            bounds: { yMin: yMin - yBuffer, yMax: yMax + yBuffer, xMin: xMin - xBuffer, xMax: xMax + xBuffer },
        });
    }

    renderLayers() {
        const { data, sizeScale } = this.state;

        if (!data.length) return;
        const vectorLayer = new IconLayer(this.props, {
            id: `${this.props.id}-icon`,
            data,
            // getSize: () => this.state.sizeScale,
            getIcon: (d) => clampNum(d.speed),
            getAngle: (d) => d.angle,
            getPosition: (d) => d.position,
            // false switches wind direction in globe view
            // true makes the wind barbs follow you, making them change directions
            iconAtlas: barbsPNG,
            iconMapping: ICON_MAPPING,
            extensions: [new CollisionFilterExtension()],
            collisionEnabled: false,
            // alphaCutoff: -100,
            // getCollisionPriority: () => 0,
            sizeScale: sizeScale,
            pickable: false,
            collisionTestProps: {
                sizeScale: sizeScale,
            },
        });

        // eslint-disable-next-line consistent-return
        return vectorLayer;
    }
}

VectorLayer.layerName = 'VectorLayer';
VectorLayer.defaultProps = defaultProps;

export { VectorLayer };
