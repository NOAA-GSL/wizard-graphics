import proj4 from 'proj4';
import { WebMercatorViewport, _GlobeViewport } from '@deck.gl/core';
import gUtilities from './graphicsUtilities';
import deckUtilities from './deckUtilities';

export default class Projection {
    constructor(
        { nx, ny, dx, dy, firstLat, firstLon, proj, rotate, rotation, wrapLongitude, datelineFix },
        resLevel = 1,
    ) {
        this.nx = Math.ceil(nx / resLevel);
        this.ny = Math.ceil(ny / resLevel);
        this.dx = dx * resLevel;
        this.dy = dy * resLevel;
        this.firstLat = firstLat;
        this.firstLon = firstLon;
        this.proj = proj;
        this.resLevel = resLevel;
        this.wrapLongitude = wrapLongitude || false;
        this.datelineFix = datelineFix || false;
        this.rotate = rotate || false;
        this.rotation = rotation || {
            longitudeOfSouthernPoleInDegrees: 0,
            latitudeOfSouthernPoleInDegrees: 0,
            angleOfRotationInDegrees: 0,
        };
        this.i0 = NaN;
        this.i1 = NaN;
        this.j0 = NaN;
        this.j1 = NaN;
        // Example proj
        //
        // I try to follow this, but I fail
        // x,y - common space (similar to lat/lon but can go far beyond -360 to 360)
        // i,j - model grid space
        // lat,lon - world space
        /*
        "projDict" : {
            "nx": number of x point, 
            "ny": number of y points, 
            "dx": resolution in m or degrees, 
            "dy": resolution in m or degrees,
            "firstLat" : first lat,
            "firstLon" : first lon,
            "proj": projection, e.g. "+proj=lcc +a=6371200.0 +b=6371200.0 +lon_0=265.0 +lat_0=25.0 +lat_1=25.0 +lat_2=25.0"

            // Items added after constructor
            "projection": proj4 projection

            // Items added after calcLocalDomain
            "i0": first i location of local domain
            "i1": last i location of local domain
            "j0": first j location of local domain
            "j1": last j location of local domain

            // Items added after 
        },
        */

        // Get temporary projection to get x and y values
        this.projection = proj4(this.proj);
        const [x, y] = this.projection.forward([this.firstLon, this.firstLat]);
        // Get final projection
        this.xMin = -x;
        this.yMin = -y;
        this.projection = proj4(`${this.proj} +x_0=${-x} +y_0=${-y}`);
    }

    getCorners(localDomain = true, reverse = true) {
        const { nx, ny } = this.getNxNY(localDomain);
        const path = [];

        // Get the first column
        for (let y = 0; y < ny; y += 1) {
            path.push(this.ijToLonLat(0, y, localDomain));
        }
        // Get the first row
        for (let x = 0; x < nx; x += 1) {
            path.push(this.ijToLonLat(x, ny - 1, localDomain));
        }
        // Get the last column in reverse
        for (let y = ny - 1; y >= 0; y -= 1) {
            path.push(this.ijToLonLat(nx - 1, y, localDomain));
        }
        // Get last row in reverse
        for (let x = nx - 1; x >= 0; x -= 1) {
            path.push(this.ijToLonLat(x, 0, localDomain));
        }

        for (let i = 0; i < path.length; i += 1) {
            if (reverse) {
                path[i].reverse();
            }
        }

        return path;
    }

    getNxNY(localDomain) {
        let nx;
        let ny;
        if (localDomain && !Number.isNaN(this.i0)) {
            ny = this.j1 - this.j0;
            nx = this.i1 - this.i0;
        } else {
            ny = this.ny;
            nx = this.nx;
        }
        return { nx, ny };
    }

    makeLonLatGrid(localDomain = true) {
        // Make the LonLatGrid
        const { nx, ny } = this.getNxNY(localDomain);
        const lonlatGrid = new Array(ny);
        for (let y = 0; y < ny; y += 1) {
            lonlatGrid[y] = new Array(nx);
            for (let x = 0; x < nx; x += 1) {
                lonlatGrid[y][x] = this.ijToLonLat(x, y, localDomain);
            }
        }
        this.lonlatGrid = lonlatGrid;
    }

    qcPoints() {
        // Make sure i0...j0 points don't go outside of domain
        this.j0 = Math.max(this.j0, 0);
        this.j1 = Math.min(this.j1, this.ny);
        this.i1 = Math.min(this.i1, this.nx);
        if (this.wrapLongitude) {
            // wrapLongitude can allow points -nx to +nx
            this.i0 = Math.max(this.i0, -this.nx);
            // -1 is important for creating no seams in the globe
            const correction = this.i1 - this.i0 - this.nx - 1;
            if (correction > 0) {
                this.i0 += Math.ceil(correction / 2);
                this.i1 -= Math.floor(correction / 2);
            }
        } else {
            this.i0 = Math.max(this.i0, 0);
        }
    }

    makeresponse() {
        return {
            i0: this.i0,
            j0: this.j0,
            i1: this.i1,
            j1: this.j1,
            nx: this.nx,
            ny: this.ny,
            resLevel: this.resLevel,
        };
    }

    //
    // Adds i0, i1, j0, j1 of the local domain to this.projDict
    // nx and ny will remain the nx and ny of the origional domain
    calcLocalDomain(lat, lon, ny, nx) {
        const [i, j] = this.LonLatToij(lon, lat, true, true);
        this.i0 = i - Math.floor(nx / 2);
        this.i1 = i + Math.floor(nx / 2);
        this.j0 = j - Math.floor(ny / 2);
        this.j1 = j + Math.floor(ny / 2);

        this.qcPoints();

        return this.makeresponse();
    }

    calcLocalDomainFromViewport(x4dDisplay, viewState, tiling, mapType = 'Mapbox') {
        const { i0, i1, j0, j1 } = this.getViewportBoundsIJ(x4dDisplay, viewState, mapType, tiling);

        this.i0 = i0;
        this.i1 = i1;
        this.j0 = j0;
        this.j1 = j1;

        this.qcPoints();

        return this.makeresponse();
    }

    getViewportBoundsIJ(x4dDisplay, viewState, mapType, tiling = undefined) {
        const { clientWidth, clientHeight } = x4dDisplay.current;

        // Step 1 - Get the viewport (can't use displayRef since that is not loaded the first time around)
        let viewport;

        if (['Mapbox', 'geojson'].includes(mapType)) {
            viewport = new WebMercatorViewport({
                ...viewState,
                width: clientWidth,
                height: clientHeight,
            });
        } else {
            viewport = new _GlobeViewport({
                ...viewState,
                width: clientWidth,
                height: clientHeight,
            });
        }

        // Step 2) Made a grid of relative screen points to be sampled
        let {
            yMin: j0,
            yMax: j1,
            xMin: i0,
            xMax: i1,
        } = deckUtilities.getViewportBounds(viewport, this);

        // Step 3) adjust i0,i1,j0,j1 so they align with tiles
        // chunks and tiles don't have to align but they should for the best performance
        if (tiling) {
            i0 = Math.floor(i0 / tiling.x) * tiling.x;
            i1 = Math.ceil(i1 / tiling.x) * tiling.x;
            j0 = Math.floor(j0 / tiling.y) * tiling.y;
            j1 = Math.ceil(j1 / tiling.y) * tiling.y;
        }

        return { i0, i1, j0, j1 };
    }

    //
    // Looks at the viewport and determins what resolution we should use
    calcResLevel(x4dDisplay, viewState, tilingConfig, mapType = 'Mapbox') {
        // Step 1 - Get viewport boundsIJ
        // let the points go outside of the domain (i.e. i0 can be <0 and i1 can be > nx)
        // This ensures that the resolution won't change if we are just clipping a domain

        // Always calculate the resLevel for a pitch of 0.  We don't want the resolution changing
        // if a user tilts the maps
        const altViewState = { ...viewState };
        altViewState.pitch = 0;
        const { i0, i1, j0, j1 } = this.getViewportBoundsIJ(x4dDisplay, altViewState, mapType);

        // Step 2 - Determine the best resolution
        const { resLevels, targetNx, targetNy } = tilingConfig;
        const di = i1 - i0;
        const dj = j1 - j0;

        // Find the cloest resLevel to the calculated value
        const resLevelI = gUtilities.closestceilvalue(resLevels, di / targetNx);
        const resLevelJ = gUtilities.closestceilvalue(resLevels, dj / targetNy);
        const resLevel = Math.max(resLevelI, resLevelJ);

        return resLevel;
    }

    rotateCoordinate(lon, lat, option) {
        lon = (lon * Math.PI) / 180; // Convert degrees to radians
        lat = (lat * Math.PI) / 180;

        const { longitudeOfSouthernPoleInDegrees, latitudeOfSouthernPoleInDegrees } = this.rotation;
        let theta = 90 + latitudeOfSouthernPoleInDegrees; // Rotation around y-axis
        let phi = longitudeOfSouthernPoleInDegrees; // Rotation around z-axis

        phi = (phi * Math.PI) / 180; // Convert degrees to radians
        theta = (theta * Math.PI) / 180;

        const x = Math.cos(lon) * Math.cos(lat); // Convert from spherical to cartesian coordinates
        const y = Math.sin(lon) * Math.cos(lat);
        const z = Math.sin(lat);

        let x_new;
        let y_new;
        let z_new;
        if (option === 1) {
            // Regular -> Rotated

            x_new =
                Math.cos(theta) * Math.cos(phi) * x +
                Math.cos(theta) * Math.sin(phi) * y +
                Math.sin(theta) * z;
            y_new = -Math.sin(phi) * x + Math.cos(phi) * y;
            z_new =
                -Math.sin(theta) * Math.cos(phi) * x -
                Math.sin(theta) * Math.sin(phi) * y +
                Math.cos(theta) * z;
        }
        if (option === 2) {
            // Rotated -> Regular

            phi = -phi;
            theta = -theta;

            x_new =
                Math.cos(theta) * Math.cos(phi) * x +
                Math.sin(phi) * y +
                Math.sin(theta) * Math.cos(phi) * z;
            y_new =
                -Math.cos(theta) * Math.sin(phi) * x +
                Math.cos(phi) * y -
                Math.sin(theta) * Math.sin(phi) * z;
            z_new = -Math.sin(theta) * x + Math.cos(theta) * z;
        }

        let lon_new = Math.atan2(y_new, x_new); // Convert cartesian back to spherical coordinates
        let lat_new = Math.asin(z_new);

        lon_new = (lon_new * 180) / Math.PI; // Convert radians back to degrees
        lat_new = (lat_new * 180) / Math.PI;

        return [lon_new, lat_new]; // Return the new coordinates
    }

    LonLatToij(longitude, latitude, round, localDomain = true, commonCoordinates = false) {
        let lat = latitude;
        let lon = longitude;
        // Do we need to rotate coordinates?
        if (this.rotate) {
            [lon, lat] = this.rotateCoordinate(lon, lat, 1);
        }

        // Needed for zoom in near Guam on the LREF, breaks RRFS which is why
        // i added datelineFix flag
        if (!commonCoordinates && this.datelineFix) {
            // Don't allow negative lon values if first lon is positive
            // Don't allow positive lon values if first lon is negative
            if (this.firstLon > 0 && lon < 0) lon += 360;
            if (this.firstLon < 0 && lon > 0) lon -= 360;
        }

        let i;
        let j;
        // x_0 and y_0 don't impact longlat grids, need to add them back in
        if (this.proj.includes('longlat')) {
            i = (lon - this.firstLon) / this.dx;
            j = (lat - this.firstLat) / this.dy;
        } else {
            [i, j] = this.projection.forward([lon, lat]);
            i /= this.dx;
            j /= this.dy;
        }

        if (localDomain && !Number.isNaN(this.i0) && !Number.isNaN(this.j0)) {
            i -= this.i0;
            j -= this.j0;
        }

        if (round) {
            i = Math.round(i);
            j = Math.round(j);
        }

        return [i, j];
    }

    // localDomain is the smaller subset of the original domain.
    // so i,j can be the i,j of the original domain or local domain
    ijToLonLat(iorg, jorg, localDomain = true) {
        let i = iorg;
        let j = jorg;
        // Add i0 and j0 to i,j if available
        if (localDomain && !Number.isNaN(this.i0) && !Number.isNaN(this.j0)) {
            i += this.i0;
            j += this.j0;
        }

        let [lon, lat] = this.projection.inverse([i * this.dx, j * this.dy]);

        // x_0 and y_0 don't impact longlat grids, need to add them back in
        if (this.proj.includes('longlat')) {
            lon += this.firstLon;
            lat += this.firstLat;
        }

        // Do we need to rotate grid?
        if (this.rotate) {
            [lon, lat] = this.rotateCoordinate(lon, lat, 2);
        }

        // Needed for HREF Alaska
        if (this.firstLon > 0 && lon < 0) lon += 360;
        if (this.firstLon < 0 && lon > 0) lon -= 360;

        return [lon, lat];
    }
}
