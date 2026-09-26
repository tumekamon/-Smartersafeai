import type { HeatCell } from "@/lib/metrics";

export function HeatMap({
  levels,
  zones,
  cells,
  max,
  compact = false,
}: {
  levels: string[];
  zones: string[];
  cells: HeatCell[];
  max: number;
  compact?: boolean;
}) {
  const cellFor = (level: string, zone: string) => cells.find((c) => c.level === level && c.zone === zone);
  const size = compact ? "h-9" : "h-14";

  return (
    <div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `${compact ? "1.6rem" : "2.2rem"} repeat(${zones.length}, minmax(0, 1fr))` }}
      >
        <span />
        {zones.map((z) => (
          <span key={z} className="pb-0.5 text-center text-[10px] font-medium uppercase tracking-wider text-foreground/45">
            {compact ? z[0] : z}
          </span>
        ))}
        {levels.map((level) => (
          <div key={level} className="contents">
            <span className="flex items-center text-[11px] font-semibold text-foreground/55">{level}</span>
            {zones.map((zone) => {
              const cell = cellFor(level, zone);
              const count = cell?.count ?? 0;
              const pct = max === 0 ? 0 : 8 + 82 * (count / max);
              const strong = count > 0 && pct > 52;
              return (
                <div
                  key={zone}
                  title={`${level} ${zone}: ${count} finding${count === 1 ? "" : "s"}${cell && cell.critical ? ` (${cell.critical} high or critical)` : ""}`}
                  className={`relative flex ${size} items-center justify-center rounded-lg text-sm font-semibold transition-transform hover:scale-[1.04]`}
                  style={{
                    background:
                      count === 0
                        ? "var(--surface-muted)"
                        : `color-mix(in srgb, var(--chart-series-1) ${pct}%, var(--surface))`,
                    color: strong ? "#fff" : "var(--foreground)",
                  }}
                >
                  {count > 0 ? count : ""}
                  {cell && cell.critical > 0 && !compact && (
                    <span
                      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                      style={{ background: strong ? "#fff" : "var(--status-critical)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {!compact && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-foreground/50">
          <span>Fewer</span>
          {[8, 30, 52, 74, 90].map((p) => (
            <span
              key={p}
              className="h-2.5 w-7 rounded"
              style={{ background: `color-mix(in srgb, var(--chart-series-1) ${p}%, var(--surface))` }}
            />
          ))}
          <span>More findings</span>
          <span className="ml-3 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--status-critical)" }} />
            has high or critical
          </span>
        </div>
      )}
    </div>
  );
}
