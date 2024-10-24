import { WebMercatorViewport, _GlobeViewport } from '@deck.gl/core';
import gUtilities from './graphicsUtilities';

export default class deckUtilities {
    static getLatLonPerPixel(viewport) {
        // Always calculate the resLevel for a pitch of 0.  We don't want the resolution changing
        // if a user tilts the maps
        const { width, height, latitude, longitude, zoom } = viewport;
        // Globeview bearing is undefined, so grab it this way
        const bearing = viewport.bearing || 0;
        let viewportNoPitch;
        if (viewport.id.includes('geojson3D')) {
            viewportNoPitch = new _GlobeViewport({
                width,
                height,
                latitude,
                longitude,
                zoom,
                bearing,
                pitch: 0,
            });
        } else {
            viewportNoPitch = new WebMercatorViewport({
                width,
                height,
                latitude,
                longitude,
                zoom,
                bearing,
                pitch: 0,
            });
        }

        const { unproject } = viewportNoPitch;

        const corners = [
            unproject([0, 0]),
            unproject([width / 2, 0]),
            unproject([width, 0]),
            unproject([width, height / 2]),
            unproject([width, height]),
            unproject([width / 2, height]),
            unproject([0, height]),
        ];

        const lons = corners.map((x) => x[0]);
        const lats = corners.map((x) => x[1]);

        const lonDiff = this.degreeDiff(Math.max(...lons), Math.min(...lons));
        const latDiff = this.degreeDiff(Math.max(...lats), Math.min(...lats));

        const latPerPixel = latDiff / height;
        const lonPerPixel = lonDiff / width;

        return { latPerPixel, lonPerPixel };
    }

    static getViewport(ref, displayNum = 0) {
        // mapboxOverlay vs deck
        return (
            ref.current?._deck?.viewManager?.getViewports()?.[displayNum] ||
            ref?.current?.deck?.viewManager?.getViewports()?.[displayNum]
        );
    }

    static getViewportBounds(viewport, proj = undefined) {
        // Get bounds does not work correctly with globe viewport, becuase of this doing the alternative below
        // let [xMin, yMin, xMax, yMax] = viewport.getBounds();
        const { unproject, width, height } = viewport;
        const screenValues = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

        const xValues = [];
        const yValues = [];
        for (const x of screenValues) {
            for (const y of screenValues) {
                const [lon, lat] = unproject([width * x, height * y]);
                // console.log('yes', lon, lat, proj);
                if (proj) {
                    const [i, j] = proj.LonLatToij(lon, lat);
                    yValues.push(j);
                    xValues.push(i);
                } else {
                    yValues.push(lat);
                    xValues.push(lon);
                }
            }
        }

        // Takes about 0.2 ms
        // console.log('done', performance.now() - t0);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);

        return { yMin, yMax, xMin, xMax };
    }

    static getCities(viewport, tree, dys, cityBaseScale = 14) {
        const FontsizeInPixels = 16;
        const { unproject } = viewport;
        if (!unproject) return undefined;

        const { yMin, yMax, xMin, xMax } = this.getViewportBounds(viewport);

        const { latPerPixel } = deckUtilities.getLatLonPerPixel(viewport);
        // Adjust this value to make the city density larger or smaller
        const padding = cityBaseScale * 0.3 || 4;
        const dyRaw = ((latPerPixel * FontsizeInPixels) / 2) * padding;
        const dysCopy = [...dys];
        dysCopy.sort();
        const dy = gUtilities.closestfloorvalue(dysCopy, dyRaw);
        // The search here is quick.
        return tree[dy].search({
            minX: xMin,
            maxX: xMax,
            minY: yMin,
            maxY: yMax,
        });
    }

    static degreeDiff(d1, degree2) {
        let degree1 = d1;
        if (degree1 < degree2) degree1 += 360;
        const diff = Math.abs(degree1 - degree2);

        return diff;
    }
}
