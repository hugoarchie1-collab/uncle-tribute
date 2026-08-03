/**
 * ROSE MARK — the estate's flat, geometric brand emblem.
 *
 * A single-colour, vector, 8-fold geometric rosette (a rose window / mandala —
 * Stephen's own subject), drawn as a SOLID silhouette so it reads at ANY size,
 * from a 16px favicon to a wall. Replaces the photoreal 3D wax-seal PNG, which
 * looked artisanal, collapsed to a red blob when small, and clashed with the
 * flat serif logotype (Hugo 2026-08-03 — "make it 10/10, one consistent flat
 * vector language like the world-class art brands").
 *
 * MONOCHROME: everything paints in `currentColor`, so it inverts cleanly and
 * works in cream-on-dark, ink-on-light, or a single foil. Pass a `className`
 * with a text-colour + a width/height. No external asset, no raster, no shadow.
 */
export const RoseMark = ({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    role={title ? "img" : undefined}
    aria-hidden={title ? undefined : true}
    fill="currentColor"
  >
    {title ? <title>{title}</title> : null}
    {/* Eight petals — a pointed vesica, repeated every 45°, forming the rose.
        Solid fill so the silhouette survives to favicon scale. */}
    <g>
      {Array.from({ length: 8 }).map((_, i) => (
        <path
          key={i}
          d="M50 9 C 58 21, 58 33, 50 44 C 42 33, 42 21, 50 9 Z"
          transform={`rotate(${i * 45} 50 50)`}
        />
      ))}
    </g>
    {/* Second, shorter ring of eight petals offset 22.5°, filling the gaps for a
        full rose-window rosette — still one flat colour. */}
    <g opacity="0.9">
      {Array.from({ length: 8 }).map((_, i) => (
        <path
          key={i}
          d="M50 22 C 55 30, 55 37, 50 43 C 45 37, 45 30, 50 22 Z"
          transform={`rotate(${i * 45 + 22.5} 50 50)`}
        />
      ))}
    </g>
    {/* Centre — a small solid disc with a hairline ring, the compass hub. */}
    <circle cx="50" cy="50" r="6.5" />
    {/* Containing ring — a thin geometric boundary (drawn as a stroked ring via
        two circles so it stays a pure fill, no stroke-scaling worries). */}
    <path
      fillRule="evenodd"
      d="M50 2 A48 48 0 1 1 49.99 2 Z M50 5 A45 45 0 1 0 50.01 5 Z"
    />
  </svg>
);

export default RoseMark;
