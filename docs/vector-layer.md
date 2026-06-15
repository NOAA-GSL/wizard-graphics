# VectorLayer

`VectorLayer` renders wind barbs as icons with adaptive sampling based on zoom and viewport.

## Data Contract

The layer accepts `lonlatGrid` as point geometry and samples vectors from `dataDir` and `dataMag`.

Supported `lonlatGrid` layouts:

1. Flattened structured grid (preferred for `quadkey` mode):
   - `lonlatGrid`: 1D array of `[lon, lat]`
   - `shape`: `[rows, cols]`
   - `dataDir`: 1D array of direction values (degrees)
   - `dataMag`: 1D array of magnitude/speed values

2. Flattened point list (unstructured/spherical sampling):
   - `lonlatGrid`: 1D array of `[lon, lat]`
   - `dataDir`: 1D array of direction values (degrees)
   - `dataMag`: 1D array of magnitude/speed values
   - `shape` is optional and only used by the `quadkey` fast path.

For all modes, arrays are expected in index-aligned order (`lonlatGrid[i]`, `dataDir[i]`, `dataMag[i]`).

## VectorLayer Props

In addition to inherited `CompositeLayer`/`IconLayer` props, `VectorLayer` supports:

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `lonlatGrid` | `Array<[number, number]>` | Yes | None | Point geometry used for barb placement. |
| `dataDir` | `ArrayLike<number>` | Yes | None | Direction in degrees, aligned to `lonlatGrid` index. |
| `dataMag` | `ArrayLike<number>` | Yes | None | Magnitude/speed, aligned to `lonlatGrid` index. |
| `shape` | `[number, number] \| null` | Conditional | `null` | Required for structured `quadkey` fast sampling (`[rows, cols]`). Optional otherwise. |
| `triangulationMode` | `'quadkey' \| 'unstructured'` | No | `'quadkey'` | Sampling strategy. `quadkey` uses grid-based stepping when `shape` is provided. |
| `sizeScale` | `number` | No | `25` | Base icon scale. Effective scale also depends on zoom. |
| `spacingScale` | `number` | No | `1` | Multiplier for symbol spacing. Larger values create sparser barbs. |
| `elevation` | `number` | No | `0` | Z coordinate for placed symbols. |
| `angleOffset` | `number` | No | `0` | Extra rotation offset (commonly `180` for globe orientation). |
| `billboard` | `boolean` | No | `false` | Forwarded to icon rendering behavior. |
| `getColor` | `Accessor<Color>` | No | `(x) => x.color || [0, 0, 0, 255]` | Icon color accessor/constant. |
| `getLabel` | `Accessor<string>` | No | `(x) => x.label` | Label accessor (if used by consumers). |
| `getWeight` | `Accessor<number>` | No | `(x) => x.weight || 1` | Weight accessor (for collision priority workflows). |
| `getPosition` | `Accessor<[number, number, number?]>` | No | `(x) => x.position` | Position accessor override. |
| `parameters` | `object` | No | `{ depthCompare: 'always', cullMode: 'front' }` | GPU render-state overrides. |
| `id` | `string` | No | deck.gl generated layer id | Standard layer id override. |

Requirement rules:

1. `lonlatGrid`, `dataDir`, and `dataMag` are required.
2. If using structured `quadkey` sampling, provide `shape` as `[rows, cols]`.
3. For structured grids, `rows * cols` should match the length of `lonlatGrid`, `dataDir`, and `dataMag`.

## Notes

- Directions are converted to icon angle with `-direction + 180 + angleOffset`.
- Magnitudes are bucketed in 5-unit increments for barb icon selection.
- `quadkey` mode with `shape` uses viewport-aware grid stepping for performance.
- `unstructured` currently use projected screen-space decimation.
- Invalid/non-finite coordinates or vector values are skipped during rendering.
- The internal icon sublayer is rendered with `pickable: false`.
