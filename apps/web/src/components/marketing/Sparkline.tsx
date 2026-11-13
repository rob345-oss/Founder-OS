import type { SeriesPoint } from "@/lib/marketing/types";

export function Sparkline({ points, height = 40 }: { points: SeriesPoint[]; height?: number }) {
  if (!points.length) {
    return <div className="h-full w-full rounded bg-[var(--studio-bg-3)]/50" style={{ height }} />;
  }
  const w = 120;
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const coords = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const d = `M ${coords.join(" L ")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(91,140,255,0.35)" />
          <stop offset="100%" stopColor="rgba(91,140,255,0)" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w},${height} L 0,${height} Z`} fill="url(#sparkFill)" />
      <path d={d} fill="none" stroke="var(--studio-accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
