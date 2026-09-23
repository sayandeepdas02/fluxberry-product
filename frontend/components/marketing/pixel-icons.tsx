type IconProps = { className?: string };

const SQ = 1.5;

function Squares({ points, className }: { points: [number, number][]; className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      {points.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={SQ} height={SQ} fill="currentColor" />
      ))}
    </svg>
  );
}

export function PixelChevronRight({ className }: IconProps) {
  return (
    <Squares
      className={className}
      points={[
        [5, 2.5],
        [6.5, 4],
        [8, 5.5],
        [9.5, 7],
        [8, 8.5],
        [6.5, 10],
        [5, 11.5],
      ]}
    />
  );
}

export function PixelArrowRight({ className }: IconProps) {
  return (
    <Squares
      className={className}
      points={[
        [2, 7.25],
        [3.5, 7.25],
        [5, 7.25],
        [6.5, 7.25],
        [8, 7.25],
        [9.5, 7.25],
        [7.25, 4.25],
        [8.75, 5.75],
        [8.75, 8.75],
        [7.25, 10.25],
      ]}
    />
  );
}

/** The 9px crosshair used where a rule meets a rail, and at grid intersections. */
export function CrossMark({ className }: IconProps) {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden className={className}>
      <line x1="0" y1="4.5" x2="9" y2="4.5" stroke="currentColor" />
      <line x1="4.5" y1="0" x2="4.5" y2="9" stroke="currentColor" />
    </svg>
  );
}
