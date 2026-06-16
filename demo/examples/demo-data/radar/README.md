Radar demo dataset generated from KTLX Level II archive file.

Files
- KTLX20130520_200356_V06: source NEXRAD Level II file
- lonlat.json: unstructured [lon,lat] point list
- temp.json: reflectivity values (dBZ), aligned 1:1 with lonlat.json
- reflectivity.json: alias of temp.json for clarity
- meta.json: extraction metadata
- extract_reflectivity_sweep.py: reproducible extraction script

Extraction settings
- Sweep: index 0 (mean elevation ~0.512 deg)
- Variable: REF (reflectivity only)
- Geometry: unstructured lon/lat points from range/azimuth projected on WGS84
- Sampling: azimuth stride 2, gate stride 3, max range 120 km

Usage with current unstructured demo wiring
- Use lonlat.json for lonlatGrid
- Use temp.json as data input to ShadedLayer and ContourLayer
