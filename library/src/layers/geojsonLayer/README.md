# WizardGeoJsonLayer Upgrade Guide

Upgrades will likely work without problems. If not, follow the directions below

If you want to update `WizardPGeoJsonLayer`, copy the `LINE_LAYER` variable and `forwardProps` function from `sub-layer-map.ts` file in the deck.gl version you are trying to target. Paste this into the wizard-graphics `sub-layer-map.ts`. Preserve the local `PathLayer` import in wizard-graphics `sub-layer-map.ts`

Next, copy the `_renderLineLayers` function from deck.gl's `geojson-layer.ts` and copy into wizard-graphics `geojson-layer.ts`. Preserve the `protected` function in wizard-graphics `geojson-layer.ts`.
