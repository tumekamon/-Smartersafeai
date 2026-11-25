import Link from "next/link";
import { nowMs } from "@/lib/time";
import { getCurrentUser } from "@/lib/dal";
import { noticesFor, seenSince, type Notice, type NoticeTone } from "@/lib/notifications";
import { MarkSeen } from "@/components/notifications/mark-seen";
import { IconChevronLeft } from "@/components/ui/icons";

const DOT: Record<NoticeTone, string> = {
  critical: "var(--status-critical)",
  warning: "var(--status-warning)",
  good: "var(--status-good)",
  info: "var(--brand)",
};

/** "09:50" today, "Sun" this week, else "12 Nov". */
function stamp(iso: string, now: number) {
  const d = new Date(iso);
  const days = (now - d.getTime()) / 86_400_000;
  if (d.toDateString() === new Date(now).toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days < 6) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Everything that changed for the worker (design canvas W09): new on top, the rest after. */
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const now = nowMs();
  const seen = seenSince(user, now);
  const notices = noticesFor(user, now);
  const isNew = (n: Notice) => n.at > seen;
  const groups = [
    { title: "New", items: notices.filter(isNew) },
    { title: "Earlier", items: notices.filter((n) => !isNew(n)) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-[22px]">
      <MarkSeen />
      <Link href="/dashboard" className="ds-back self-start">
        <IconChevronLeft width={18} height={18} /> My Day
      </Link>
      <h1 className="disp text-[40px] leading-none">Notifications</h1>

      {notices.length === 0 ? (
        <p className="border-t-2 border-brand py-5 text-[15px] leading-relaxed text-body">
          You&apos;re all caught up. New tasks, reviews of your check-in and certificates, and updates on your reports show up here.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.title} aria-label={g.title} className="flex flex-col">
            <div className="ds-sec">
              <h2 className="eyebrow" style={{ color: "var(--foreground)" }}>
                {g.title}
              </h2>
              <span className="eyebrow">{g.items.length}</span>
            </div>
            {g.items.map((n) => {
              const fresh = isNew(n);
              return (
                <Link key={n.id} href={n.href} className="group flex gap-3.5 border-b border-border py-4">
                  <span aria-hidden="true" className="ds-dot mt-[7px]" style={{ background: fresh ? DOT[n.tone] : "color-mix(in srgb, var(--foreground) 22%, transparent)" }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`text-base leading-snug group-hover:underline ${fresh ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                    {n.body && <span className="line-clamp-2 text-sm text-body">{n.body}</span>}
                  </span>
                  <span className="eyebrow shrink-0 pt-0.5">{stamp(n.at, now)}</span>
                </Link>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
