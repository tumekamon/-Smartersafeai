import Link from "next/link";
import { nowMs } from "@/lib/time";
import { getCurrentUser } from "@/lib/dal";
import { noticesFor, seenSince, type Notice, type NoticeTone } from "@/lib/notifications";
import { timeAgo } from "@/lib/format";
import { MarkSeen } from "@/components/notifications/mark-seen";
import { IconAlertTriangle, IconArrowRight, IconBell, IconCamera, IconCheck, IconClipboardCheck, IconFileCheck } from "@/components/ui/icons";

const TONE: Record<NoticeTone, string> = {
  critical: "bg-status-critical/12 text-status-critical",
  warning: "bg-status-warning/15 text-status-warning",
  good: "bg-status-good/15 text-status-good",
  info: "bg-sidebar-accent/12 text-sidebar-accent",
};

const KIND_ICON = {
  task: IconClipboardCheck,
  "check-in": IconCamera,
  certificate: IconFileCheck,
  report: IconAlertTriangle,
} as const;

/** Everything that changed for the worker: tasks, check-in, certificates, their reports. */
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const now = nowMs();
  const seen = seenSince(user, now);
  const notices = noticesFor(user, now);
  const isNew = (n: Notice) => n.at > seen;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const groups = [
    { title: "New", items: notices.filter(isNew) },
    { title: "Today", items: notices.filter((n) => !isNew(n) && Date.parse(n.at) >= startOfToday.getTime()) },
    { title: "Earlier", items: notices.filter((n) => !isNew(n) && Date.parse(n.at) < startOfToday.getTime()) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <MarkSeen />
      <header>
        <p className="eyebrow">Last 30 days</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Notifications</h1>
      </header>

      {notices.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground/60">
            <IconBell width={24} height={24} />
          </span>
          <p className="mt-1 font-bold">You&apos;re all caught up</p>
          <p className="max-w-xs text-sm text-foreground/55">New tasks, check-in and certificate reviews, and updates on your reports show up here.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h2 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/60">
              {g.title === "New" && <span className="h-2 w-2 rounded-full bg-status-critical" />}
              {g.title}
              <span className="text-foreground/35">{g.items.length}</span>
            </h2>
            <ul className="card divide-y divide-border overflow-hidden p-0">
              {g.items.map((n) => {
                const Icon = n.tone === "good" ? IconCheck : KIND_ICON[n.kind];
                return (
                  <li key={n.id}>
                    <Link href={n.href} className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted ${isNew(n) ? "bg-sidebar-accent/[0.04]" : ""}`}>
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE[n.tone]}`}>
                        <Icon width={17} height={17} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold leading-snug">{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-foreground/60">{n.body}</span>}
                        <span className="mt-1 block text-xs text-foreground/45">{timeAgo(Date.parse(n.at), now)}</span>
                      </span>
                      <IconArrowRight width={16} height={16} className="mt-2.5 shrink-0 text-foreground/35" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
