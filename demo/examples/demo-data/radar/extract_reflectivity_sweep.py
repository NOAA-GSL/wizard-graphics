import json
from pathlib import Path

import numpy as np
from metpy.io import Level2File
from pyproj import Geod

INPUT_FILE = Path('demo/examples/demo-data/radar/KTLX20130520_200356_V06')
OUT_LONLAT = Path('demo/examples/demo-data/radar/lonlat.json')
OUT_TEMP = Path('demo/examples/demo-data/radar/temp.json')
OUT_META = Path('demo/examples/demo-data/radar/meta.json')

SWEEP_INDEX = 0  # Closest to requested 0.5 degree elevation
AZIMUTH_STRIDE = 2
GATE_STRIDE = 3
MAX_RANGE_KM = 120.0


def main():
    level2 = Level2File(str(INPUT_FILE))
    sweep = level2.sweeps[SWEEP_INDEX]

    lat0 = float(sweep[0][1].lat)
    lon0 = float(sweep[0][1].lon)

    geod = Geod(ellps='WGS84')

    lonlat = []
    reflectivity = []
    selected = []

    for radial_idx in range(0, len(sweep), AZIMUTH_STRIDE):
        radial = sweep[radial_idx]
        ref_block = radial[4].get(b'REF')
        if ref_block is not None:
            selected.append((radial[0], ref_block[0], np.asarray(ref_block[1], dtype=np.float32)))

    if not selected:
        raise RuntimeError('No REF moments found in selected sweep/ray stride.')

    template_ref_hdr = selected[0][1]
    template_vals = selected[0][2]
    gate_indices = np.arange(0, template_vals.size, GATE_STRIDE, dtype=np.int32)
    ranges_km = float(template_ref_hdr.first_gate) + gate_indices * float(template_ref_hdr.gate_width)
    keep_range = ranges_km <= MAX_RANGE_KM
    gate_indices = gate_indices[keep_range]
    ranges_km = ranges_km[keep_range]

    gate_count = int(gate_indices.size)
    ray_count = len(selected)

    for radial_hdr, _ref_hdr, vals in selected:
        azimuth_deg = float(radial_hdr.az_angle)
        elev_deg = float(radial_hdr.el_angle)

        row_vals = np.full(gate_count, np.nan, dtype=np.float32)
        valid = gate_indices < vals.size
        row_vals[valid] = vals[gate_indices[valid]]

        # Project slant range to ground range for low-elevation PPI plotting.
        ground_ranges_m = ranges_km * 1000.0 * np.cos(np.deg2rad(elev_deg))
        azimuths = np.full_like(ground_ranges_m, azimuth_deg, dtype=np.float64)

        lons, lats, _ = geod.fwd(
            np.full_like(ground_ranges_m, lon0, dtype=np.float64),
            np.full_like(ground_ranges_m, lat0, dtype=np.float64),
            azimuths,
            ground_ranges_m,
        )

        lonlat.extend([[round(float(lon), 5), round(float(lat), 5)] for lon, lat in zip(lons, lats)])
        reflectivity.extend([None if not np.isfinite(v) else round(float(v), 2) for v in row_vals])

    OUT_LONLAT.write_text(json.dumps(lonlat, separators=(',', ':')))
    OUT_TEMP.write_text(json.dumps(reflectivity, separators=(',', ':')))

    elevs = [float(radial[0].el_angle) for radial in sweep]
    meta = {
        'source_file': str(INPUT_FILE.name),
        'site': level2.stid.decode('ascii') if isinstance(level2.stid, bytes) else str(level2.stid),
        'site_lat': lat0,
        'site_lon': lon0,
        'variable': 'reflectivity_dbz',
        'sweep_index': SWEEP_INDEX,
        'sweep_mean_elevation_deg': float(np.mean(elevs)),
        'azimuth_stride': AZIMUTH_STRIDE,
        'gate_stride': GATE_STRIDE,
        'max_range_km': MAX_RANGE_KM,
        'rows': ray_count,
        'cols': gate_count,
        'point_count': len(reflectivity),
        'ray_count_used': ray_count,
    }
    OUT_META.write_text(json.dumps(meta, indent=2))

    print(f'Wrote {len(reflectivity)} reflectivity samples to {OUT_TEMP}')
    print(f'Wrote {len(lonlat)} lon/lat points to {OUT_LONLAT}')
    print(f'Metadata: {OUT_META}')


if __name__ == '__main__':
    main()
