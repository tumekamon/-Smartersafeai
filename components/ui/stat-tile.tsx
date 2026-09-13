import type { ComponentType, SVGProps } from "react";

type Tone = "good" | "warning" | "serious" | "critical" | "neutral" | "info";

const toneVar: Record<Tone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
  neutral: "var(--status-neutral)",
  info: "var(--chart-series-1)",
};

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  const color = toneVar[tone];

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-surface p-4"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
          {label}
        </p>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ color, background: `color-mix(in srgb, ${color} 14%, var(--surface))` }}
        >
          <Icon width={14} height={14} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold" style={{ fontVariantNumeric: "normal" }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-foreground/50">{hint}</p>}
    </div>
  );
}
