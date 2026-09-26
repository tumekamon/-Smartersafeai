import Link from "next/link";
import type { ActivityEvent } from "@/lib/metrics";
import { timeAgo } from "@/lib/format";
import { IconCheck, IconClipboardCheck, IconEye, IconFileCheck, IconSparkle } from "@/components/ui/icons";

const kindStyle = {
  inspection: { Icon: IconClipboardCheck, color: "var(--chart-series-1)" },
  ai: { Icon: IconSparkle, color: "var(--ai)" },
  review: { Icon: IconEye, color: "var(--status-warning)" },
  action: { Icon: IconCheck, color: "var(--status-good)" },
  permit: { Icon: IconFileCheck, color: "var(--status-neutral)" },
  notice: { Icon: IconFileCheck, color: "var(--status-neutral)" },
} as const;

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
      {events.map((e) => {
        const { Icon, color } = kindStyle[e.kind];
        return (
          <li key={e.id} className="relative flex gap-3">
            <span
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
              style={{ color }}
            >
              <Icon width={14} height={14} />
            </span>
            <Link href={e.href} className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm leading-snug">
                <span className="font-semibold">{e.actor}</span>{" "}
                <span className="text-foreground/60">{e.verb}</span>{" "}
                <span className="font-medium">{e.subject}</span>
              </p>
              <p className="mt-0.5 text-xs text-foreground/40">{timeAgo(e.at)}</p>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
