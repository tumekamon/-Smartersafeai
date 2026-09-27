import Link from "next/link";
import type { Insight } from "@/lib/metrics";
import { IconArrowRight, IconSparkle } from "@/components/ui/icons";

const toneVar = {
  critical: "var(--status-critical)",
  serious: "var(--status-serious)",
  warning: "var(--status-warning)",
  good: "var(--status-good)",
  info: "var(--chart-series-1)",
} as const;

export function InsightCard({ insight }: { insight: Insight }) {
  const color = toneVar[insight.tone];
  const body = (
    <div className="card group relative flex h-full flex-col overflow-hidden p-5 transition-all hover:shadow-lg hover:-translate-y-1">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="ai-chip">
          <IconSparkle width={12} height={12} />
          AI insight
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {insight.metric}
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug">{insight.headline}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/60">{insight.detail}</p>
      {insight.href && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sidebar-accent">
          Investigate
          <IconArrowRight width={13} height={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </div>
  );
  return insight.href ? <Link href={insight.href} className="block h-full">{body}</Link> : body;
}
