# DESIGeoJsonLayer Upgrade Guide

Upgrades will likely work without problems. If not, follow the directions below

If you want to update `DESIPGeoJsonLayer`, copy the `LINE_LAYER` variable and `forwardProps` function from `sub-layer-map.ts` file in the deck.gl version you are trying to target. Paste this into the desi-graphics `sub-layer-map.ts`. Preserve the local `PathLayer` import in desi-graphics `sub-layer-map.ts`

Next, copy the `_renderLineLayers` function from deck.gl's `geojson-layer.ts` and copy into desi-graphics `geojson-layer.ts`. Preserve the `protected` function in desi-graphics `geojson-layer.ts`.
