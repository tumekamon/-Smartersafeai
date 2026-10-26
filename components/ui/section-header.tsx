import type { ComponentType, ReactNode, SVGProps } from "react";

/** Card heading used across the app: tinted icon, short bold title, optional action on the right. */
export function SectionHeader({
  Icon,
  title,
  tone = "brand",
  action,
}: {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  tone?: "brand" | "ai" | "critical" | "warning" | "good";
  action?: ReactNode;
}) {
  const color = {
    brand: "var(--brand)",
    ai: "var(--ai)",
    critical: "var(--status-critical)",
    warning: "var(--status-warning)",
    good: "var(--status-good)",
  }[tone];
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <Icon width={20} height={20} strokeWidth={2} />
      </span>
      <h2 className="min-w-0 flex-1 text-base font-bold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}
