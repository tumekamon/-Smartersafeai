export type DonutSegment = { label: string; value: number; color: string };

export function Donut({
  segments,
  size = 132,
  stroke = 16,
  center,
  caption,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  center: string;
  caption?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const starts = segments.map((_, i) => segments.slice(0, i).reduce((sum, x) => sum + (x.value / total) * c, 0));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const seg = Math.max(0, len - gap);
          return (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${seg} ${c - seg}`}
              strokeDashoffset={-starts[i]}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold leading-none tracking-tight">{center}</span>
        {caption && <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-foreground/50">{caption}</span>}
      </div>
    </div>
  );
}
