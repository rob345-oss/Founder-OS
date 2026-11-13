import type { SeriesPoint } from "@/lib/marketing/types";

export function AreaChart({ points, label }: { points: SeriesPoint[]; label: string }) {
  const width = 640;
  const height = 200;
  const pad = { l: 8, r: 8, t: 8, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  if (!points.length) {
    return <p className="text-sm text-[var(--studio-text-tertiary)]">No data in range.</p>;
  }

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const coords = values.map((v, i) => {
    const x = pad.l + (i / Math.max(values.length - 1, 1)) * innerW;
    const y = pad.t + innerH - (v / max) * innerH;
    return { x, y, v, date: points[i]!.date };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath = `M ${coords[0]!.x},${pad.t + innerH} L ${coords.map((c) => `${c.x},${c.y}`).join(" L ")} L ${coords[coords.length - 1]!.x},${pad.t + innerH} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${label} trend`}>
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(91,140,255,0.45)" />
            <stop offset="100%" stopColor="rgba(91,140,255,0.02)" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={pad.l}
              x2={width - pad.r}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}
        <path d={areaPath} fill="url(#areaGrad)" />
        <polyline points={line} fill="none" stroke="var(--studio-accent)" strokeWidth="2" strokeLinejoin="round" />
        {coords.length > 0 ? (
          <text x={pad.l} y={height - 6} className="fill-[var(--studio-text-tertiary)] text-[10px]">
            {coords[0]!.date}
          </text>
        ) : null}
        {coords.length > 1 ? (
          <text x={width - pad.r - 64} y={height - 6} className="fill-[var(--studio-text-tertiary)] text-[10px]">
            {coords[coords.length - 1]!.date}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
