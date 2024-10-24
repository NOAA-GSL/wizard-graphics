// radius used by deck.gl, see https://github.com/visgl/deck.gl/blob/master/modules/core/src/viewports/globe-viewport.js#L10
export const DEFAULT_RADIUS = 6370972;

function toRadians(value: number): number {
    return (value / 180) * Math.PI;
}

export function distance(
    start: GeoJSON.Position,
    destination: GeoJSON.Position,
    radius: number = DEFAULT_RADIUS,
): number {
    // a = sin²(Δφ/2) + cos(φ1)⋅cos(φ2)⋅sin²(Δλ/2)
    // δ = 2·atan2(√(a), √(1−a))
    // see mathforum.org/library/drmath/view/51879.html for derivation

    const R = radius;
    const φ1 = toRadians(start[1]),
        λ1 = toRadians(start[0]);
    const φ2 = toRadians(destination[1]),
        λ2 = toRadians(destination[0]);
    const Δφ = φ2 - φ1;
    const Δλ = λ2 - λ1;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;

    return d;
}
