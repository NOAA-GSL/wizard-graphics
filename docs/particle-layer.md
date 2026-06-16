# ParticleLayer

`ParticleLayer` renders animated wind particles as instanced line segments.

## Data Contract

The layer accepts `lonlatGrid` as its grid source.

Supported `lonlatGrid` layouts:

1. Flattened grid (preferred):
   - `lonlatGrid`: 1D array of `[lon, lat]`
   - `shape`: `[rows, cols]`
   - `dataDir`: 1D array of direction values (degrees)
   - `dataMag`: 1D array of magnitude values

2. Unstructured grid:
  - `lonlatGrid`: 1D array of `[lon, lat]` polygon vertices in boundary order
  - Triangulation is generated with `earcut`; particles are constrained to those triangles.

For flattened mode, arrays are expected in row-major order and aligned by index.

## ParticleLayer Props

In addition to inherited `LineLayer` props, `ParticleLayer` supports:

| Prop | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `lonlatGrid` | `Array<[number, number]> \| Array<Array<[number, number]>>` | Yes | None | Grid point coordinates. Supports flattened 1D points and nested 2D rows. |
| `dataDir` | `ArrayLike<number>` | Conditional | None | Required when `image` is not provided. Direction field in degrees, aligned to `lonlatGrid` index. |
| `dataMag` | `ArrayLike<number>` | Conditional | None | Required when `image` is not provided. Magnitude field aligned to `lonlatGrid` index. |
| `shape` | `[number, number] \| null` | Conditional | Treated as `[1, lonlatGrid.length]` when omitted for flat arrays | Required for flattened structured grids so points are interpreted as row/column cells. Not required for nested 2D grids or unstructured polygon rings. |
| `id` | `string` | No | deck.gl generated layer id | Standard layer id override. |
| `image` | `string \| Texture \| null` | No | `null` | Optional prebuilt wind texture. If omitted, the layer builds one from `dataDir` and `dataMag`. |
| `bounds` | `[number, number, number, number]` | No | Sampled from `lonlatGrid` | Optional override as `[west, south, east, north]`. |
| `numParticles` | `number` | No | `10000` | Number of simulated particles. |
| `maxAge` | `number` | No | `50` | Number of particle history slots retained. |
| `speedFactor` | `number` | No | `3` | Global advection speed multiplier. |
| `color` | `[number, number, number, number]` | No | `[255, 255, 255, 255]` | RGBA particle color. |
| `width` | `number` | No | `1.2` | Line width passed to the underlying line rendering. |
| `animate` | `boolean` | No | `true` | Enables/disables simulation stepping. |
| `wrapLongitude` | `boolean` | No | `true` | Enables longitude wrapping behavior for world-scale datasets. |
| `trailLength` | `number` | No | `22` | Number of rendered trail segments per particle (clamped by `maxAge`). |
| `fadeTrails` | `boolean` | No | `true` | Applies age-based alpha fade in the fragment stage. |

Requirement rules:

1. `lonlatGrid` is always required.
2. If `image` is omitted, both `dataDir` and `dataMag` should be provided.
3. If `lonlatGrid` is a flat structured grid, `shape` should be provided as `[rows, cols]`.

## Notes

- The wind texture cache key includes both grid signature and a sampled data fingerprint.
- Invalid or missing wind samples produce dropped particles for that sample location.
- Particle spawning and advection are constrained to triangle-covered pixels (not just the bounding box).
