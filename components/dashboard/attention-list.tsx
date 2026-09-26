import Link from "next/link";
import type { AttentionItem } from "@/lib/metrics";
import { timeAgo } from "@/lib/format";
import {
  IconArrowRight,
  IconBuilding,
  IconClock,
  IconFileCheck,
  IconSparkle,
  IconUsers,
} from "@/components/ui/icons";

const kindIcon = {
  review: IconSparkle,
  overdue: IconClock,
  permit: IconFileCheck,
  cert: IconUsers,
  notice: IconBuilding,
} as const;

const toneVar = {
  critical: "var(--status-critical)",
  serious: "var(--status-serious)",
  warning: "var(--status-warning)",
  info: "var(--chart-series-1)",
} as const;

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-foreground/50">Nothing needs your attention right now.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const Icon = kindIcon[item.kind];
        const color = toneVar[item.tone];
        return (
          <li key={item.id}>
            <Link href={item.href} className="group flex items-center gap-3 py-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ color, background: `color-mix(in srgb, ${color} 14%, var(--surface))` }}
              >
                <Icon width={17} height={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-foreground/55">{item.detail}</span>
              </span>
              <span className="hidden shrink-0 text-xs text-foreground/40 sm:block">{timeAgo(item.at)}</span>
              <IconArrowRight
                width={15}
                height={15}
                className="shrink-0 text-foreground/25 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
