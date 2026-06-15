# ShadedLayer

`ShadedLayer` renders scalar gridded, spherical, or unstructured data as color-shaded polygons/triangles.

## Data Contract

The layer uses `lonlatGrid` for geometry and scalar values from `data` (or `ndata`).

Supported `lonlatGrid` layouts:

1. Flattened structured grid (preferred):
   - `lonlatGrid`: 1D array of `[lon, lat]`
   - `shape`: `[rows, cols]`
   - `data`: 1D array of scalar values aligned by index
   - Should be used with `triangulationMode` `quadkey`, `quadkey-cells`, or `unstructured`

2. Flattened spherical grid (radar):
   - `lonlatGrid`: 1D array of `[lon, lat]` points (flattened ray-major order)
   - `shape`: `[rows, cols]` where `rows` = ray count and `cols` = gate count
   - `data`: 1D reflectivity array aligned 1:1 with `lonlatGrid`
   - Recommended `triangulationMode`: `spherical` or `spherical-cells` (can also use `unstructured`)

3. Unstructured grid/ring:
   - `lonlatGrid`: 1D array of `[lon, lat]`
   - Use `triangulationMode` `unstructured` (Delaunay triangulation path).

Color ramp contract:

- `colors`: array of `rgb(...)` or `rgba(...)` strings.
- `colorLevels`: numeric breakpoints for normalization.
- `colorType`: `scaleLinear` or `scaleThreshold`.
- If `ndata` is not supplied, values are normalized from `data` using `colorLevels` and `colorType`.
- Fragment shading samples the color ramp only when normalized values are in `[0, 1]`.

## ShadedLayer Props

In addition to inherited layer props, `ShadedLayer` supports:

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `lonlatGrid` | `Array<[number, number]> \| Array<Array<[number, number]>>` | Yes | None | Geometry points used to build triangles/cells. |
| `colors` | `string[]` | Yes | None | Color ramp entries. Use `rgb(...)` or `rgba(...)` strings. |
| `data` | `ArrayLike<number>` | Conditional | None | Required when `ndata` is not provided. Scalar values aligned with `lonlatGrid`. |
| `ndata` | `ArrayLike<number>` | Conditional | None | Pre-normalized scalar values (typically in `[0, 1]`). Can be used instead of `data`+normalization. |
| `colorLevels` | `number[]` | Conditional | None | Required when `ndata` is not provided (used to normalize `data`). |
| `colorType` | `'scaleLinear' \| 'scaleThreshold'` | Conditional | Treated as non-linear sampling unless `'scaleLinear'` | Controls normalization behavior and color ramp interpolation. |
| `shape` | `[number, number]` | Conditional | None | Required for structured grid/cell modes (`quadkey`, `quadkey-cells`, `spherical`, `spherical-cells`). Format is `[rows, cols]`. |
| `triangulationMode` | `'unstructured' \| 'quadkey' \| 'quadkey-cells' \| 'spherical' \| 'spherical-cells'` | No | `'unstructured'` | Controls how geometry/data are triangulated. |
| `odata` | `ArrayLike<number>` | No | None | Raw opacity values. Normalized internally to `[0, 1]` if `nodata` is not provided. |
| `nodata` | `ArrayLike<number>` | No | None | Pre-normalized opacity values in `[0, 1]`. Overrides `odata` when both are present. |
| `elevation` | `number` | No | `0` | Elevation baked into generated vertex positions. |
| `id` | `string` | No | deck.gl generated layer id | Standard layer id override. |
| `filled` | `boolean` | No | `true` | Draw filled polygons. |
| `extruded` | `boolean` | No | `false` | Draw extruded side walls. |
| `wireframe` | `boolean` | No | `false` | Draw wireframe for extruded geometry. |
| `_normalize` | `boolean` | No | `false` | Experimental deck.gl polygon normalization toggle. |
| `_windingOrder` | `'CW' \| 'CCW'` | No | `'CW'` | Experimental ring winding override. |
| `_full3d` | `boolean` | No | `false` | Experimental full-3D tessellation mode. |
| `elevationScale` | `number` | No | `1` | Extrusion scale multiplier. |
| `getPolygon` | `AccessorFunction` | No | `(f) => f.polygon` | Base polygon accessor (advanced usage). |
| `getElevation` | `Accessor<number>` | No | `0` | Base elevation accessor (advanced usage). |
| `getFillColor` | `Accessor<Color>` | No | `[0, 0, 0, 255]` | Base fill color accessor (advanced usage). |
| `getLineColor` | `Accessor<Color>` | No | `[0, 0, 0, 255]` | Base line color accessor (advanced usage). |
| `getPolygonData` | `Accessor<number>` | No | `1000` | Internal scalar attribute accessor (advanced usage). |
| `getVertex1` | `Accessor<number>` | No | `-1` | Internal custom vertex attribute (advanced usage). |
| `getVertex2` | `Accessor<number>` | No | `-1` | Internal custom vertex attribute (advanced usage). |
| `getVertex3` | `Accessor<number>` | No | `-1` | Internal custom vertex attribute (advanced usage). |
| `getOpacity` | `Accessor<number>` | No | `-1` | Internal opacity accessor. Values in `[0, 1]` modulate final alpha. |
| `texture` | `string \| TextureSource \| Promise<TextureSource>` | No | `null` | Declared image prop. Color ramp sampling is generated from `colors`. |
| `material` | `Material` | No | `true` | Lighting material settings (when `extruded: true`). |
| `parameters` | `object` | No | `{ depthCompare: 'always', cullMode: 'back' }` | GPU render-state overrides. |

Requirement rules:

1. `lonlatGrid` and `colors` are always required in normal shaded usage.
2. Provide either `ndata`, or provide all of `data`, `colorLevels`, and `colorType`.
3. Provide `shape` when using structured/cell triangulation modes.
4. Provide `nodata` for direct opacity control, or `odata` for raw opacity values.

## Notes

- The layer normalizes scalar values and triangulates geometry in `setBuffers`, then replaces internal `props.data` with generated polygon attribute data.
- Color texture sampling uses linear filtering only when `colorType === 'scaleLinear'`; otherwise nearest/step sampling is used.
- Fragment output is transparent when scalar values are outside `[0, 1]`.
- Opacity modulation is only applied when opacity data is in `[0, 1]`.
