import Link from "next/link";
import type { User } from "@/lib/types";
import type { Capabilities } from "@/lib/authz";
import { listCorrectiveActions, listFindings, listInspections } from "@/lib/db";
import { nowMs } from "@/lib/time";
import { IconClipboardCheck, IconSparkle, IconWrench } from "@/components/ui/icons";

type WorkTab = "review" | "inspections" | "fixes";

/** The review queue, inspections and fixes as one "Work" area, shown as large tabs. */
export function workTabsFor(user: User, caps: Capabilities) {
  const tabs: { id: WorkTab; href: string; label: string; count?: number; Icon: typeof IconSparkle }[] = [];
  if (caps.canReviewFindings) {
    const pending = listFindings(user.companyId).filter((f) => f.reviewerDecision === "pending").length;
    tabs.push({ id: "review", href: "/review", label: "To review", count: pending, Icon: IconSparkle });
  }
  if (!caps.isReadOnly && user.role !== "WORKER") {
    const week = nowMs() - 7 * 86_400_000;
    const recent = listInspections(user.companyId).filter((i) => new Date(i.submittedAt).getTime() >= week).length;
    tabs.push({ id: "inspections", href: "/inspections", label: "Inspections · 7d", count: recent, Icon: IconClipboardCheck });
  }
  const open = listCorrectiveActions(user.companyId).filter((a) =>
    user.role === "WORKER" ? a.assignedToId === user.id && a.status === "open" : a.status !== "closed"
  ).length;
  tabs.push({ id: "fixes", href: "/corrective-actions", label: user.role === "WORKER" ? "My tasks" : "Fixes", count: open, Icon: IconWrench });
  return tabs;
}

export function WorkTabs({ user, caps, active }: { user: User; caps: Capabilities; active: WorkTab }) {
  const tabs = workTabsFor(user, caps);
  if (tabs.length < 2) return null;

  return (
    <nav aria-label="Work" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map(({ id, href, label, count, Icon }) => {
        const on = id === active;
        return (
          <Link
            key={id}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-center transition-colors sm:flex-row sm:gap-2.5 ${
              on ? "bg-foreground text-background" : "bg-surface text-foreground ring-1 ring-border hover:bg-surface-muted"
            }`}
          >
            <Icon width={20} height={20} strokeWidth={2} className="hidden sm:block" />
            {count !== undefined && <span className="text-2xl font-extrabold leading-none sm:text-xl">{count}</span>}
            <span className="text-xs font-bold sm:text-sm">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
