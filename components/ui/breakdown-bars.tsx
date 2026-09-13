type Tone = "good" | "warning" | "serious" | "critical" | "neutral" | "info";

const toneVar: Record<Tone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
  neutral: "var(--status-neutral)",
  info: "var(--chart-series-1)",
};

export function BreakdownBars({
  items,
}: {
  items: { label: string; value: number; tone: Tone }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = Math.max(item.value === 0 ? 0 : 4, (item.value / max) * 100);
        const color = toneVar[item.tone];
        return (
          <li key={item.label} title={`${item.label}: ${item.value}`}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium capitalize text-foreground/70">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                {item.label}
              </span>
              <span className="font-semibold text-foreground/80">{item.value}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-muted">
              <div
                className="h-2 rounded-full transition-[width]"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
