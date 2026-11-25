import Link from "next/link";
import { visibleSections } from "@/lib/home-layout";
import type { Project, User } from "@/lib/types";
import {
  getCheckInForDay,
  getCompany,
  listCertificationRecords,
  listCertifications,
  listCorrectiveActions,
  listInspections,
  listTemplates,
} from "@/lib/db";
import { certReview } from "@/lib/certifications";
import { checkInDay } from "@/lib/check-in";
import { CheckInBanner } from "@/components/check-in-status";
import { NoSiteNotice } from "@/components/site/no-site-notice";
import { TaskRow } from "@/components/tasks/task-row";
import { Avatar } from "@/components/ui/avatar";
import { unreadCount } from "@/lib/notifications";
import { activePermits, siteContacts } from "@/lib/site";
import { greeting } from "@/lib/format";
import { certStatus, isActionOverdue } from "@/lib/metrics";
import { IconBell, IconChevronRight, IconPhone, IconSiren } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

/** My Day shows the next few tasks; the Tasks tab has the rest. */
const TASKS_SHOWN = 3;
const CHECKLISTS_SHOWN = 3;

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * My Day for a worker: a site dashboard in the design canvas's language (W02).
 *
 * Above the fold on a phone: date and site with one-tap Emergency and the bell, the
 * greeting, the PPE check-in, then today at a glance (overdue, to do, being checked,
 * certificates due). Below: 01 Tasks, 02 Checklists, 03 Your site (who to call, permits
 * in force, the site page). On desktop the site sits in a column beside the work.
 */
export function WorkerDashboard({ user, site }: { user: User; site?: Project }) {
  const now = nowMs();
  const show = visibleSections(getCompany(user.companyId), "WORKER");
  const checkIn = getCheckInForDay(user.companyId, user.id, checkInDay(now));
  const unread = unreadCount(user, now);

  const mine = listCorrectiveActions(user.companyId).filter((a) => a.assignedToId === user.id && a.projectId === site?.id);
  // Open tasks, most urgent first: sent back, then overdue, then by due date.
  const rank = (a: (typeof mine)[number]) => (a.sentBack ? 0 : isActionOverdue(a) ? 1 : 2);
  const open = mine.filter((a) => a.status === "open").sort((a, b) => rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate));
  const overdue = open.filter((a) => isActionOverdue(a)).length;
  const checking = mine.filter((a) => a.status === "completed").length;

  // Certificates that need action, not counting ones already renewed and waiting.
  const renewing = new Set(
    listCertificationRecords(user.companyId, { userId: user.id })
      .filter((c) => certReview(c) === "pending")
      .map((c) => c.type)
  );
  const certsDue = listCertifications(user.companyId).filter(
    (c) => c.userId === user.id && certStatus(c.expiresOn, now) !== "current" && !renewing.has(c.type)
  ).length;

  // Today's checklists: the site's templates, ones already done today marked as such.
  const today = checkInDay(now);
  const doneToday = new Set(
    listInspections(user.companyId)
      .filter((i) => i.inspectorId === user.id && i.projectId === site?.id && checkInDay(Date.parse(i.submittedAt)) === today)
      .map((i) => i.templateId)
  );
  const checklists = listTemplates(user.companyId).slice(0, CHECKLISTS_SHOWN);

  const date = new Date(now).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const sec = { color: "var(--foreground)" };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pt-3 lg:gap-8 lg:pt-0">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow truncate">
            {date}
            {site && ` · ${site.shortName}`}
          </span>
          <div className="-mr-2.5 flex shrink-0 items-center">
            {/* One tap to 911, the muster point and first aiders, from home. */}
            {site && (
              <Link href="/emergency" aria-label="Emergency" className="flex h-11 w-11 items-center justify-center tone-critical">
                <IconSiren width={22} height={22} strokeWidth={1.8} />
              </Link>
            )}
            {/* On phones the bell lives here; desktop has it in the top bar. */}
            <Link
              href="/notifications"
              aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
              className="relative flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <IconBell width={22} height={22} strokeWidth={1.7} />
              {unread > 0 && <span aria-hidden="true" className="absolute right-[11px] top-[10px] h-[7px] w-[7px] rounded-full bg-status-critical" />}
            </Link>
          </div>
        </div>
        <h1 className="disp text-[40px] leading-none lg:text-[44px]">
          {greeting().replace("Good ", "").replace(/^./, (c) => c.toUpperCase())}, {user.firstName}
        </h1>
      </header>

      {/* Daily check-in is always shown: it's a site rule, not a layout choice. */}
      <CheckInBanner checkIn={checkIn} />

      {!site && <NoSiteNotice action="check in, inspect or report on a site" />}

      {site && show.has("tiles") && (
        <nav aria-label="Today at a glance" className="grid grid-cols-4 border-y-2 border-brand">
          <Stat href="/corrective-actions" value={overdue} label="Overdue" tone={overdue > 0 ? "tone-critical" : undefined} />
          <Stat href="/corrective-actions" value={open.length} label="To do" />
          <Stat href="/corrective-actions?tab=check" value={checking} label="Checking" />
          <Stat href="/settings/profile#certs" value={certsDue} label="Certs" tone={certsDue > 0 ? "tone-warning" : undefined} />
        </nav>
      )}

      {site && (
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-7">
            {show.has("tasks") && (
              <section aria-labelledby="tasks-head" className="flex flex-col">
                <div className="ds-sec">
                  <h2 id="tasks-head" className="eyebrow" style={sec}>
                    01 / Tasks
                  </h2>
                  {open.length > 0 ? (
                    <Link href="/corrective-actions" className="eyebrow hover:underline">
                      All {open.length}
                    </Link>
                  ) : (
                    <span className="eyebrow">None</span>
                  )}
                </div>
                {open.length === 0 ? (
                  <p className="ds-row text-[15px] text-body">Nothing to fix. Have a safe day.</p>
                ) : (
                  open.slice(0, TASKS_SHOWN).map((a) => <TaskRow key={a.id} task={a} now={now} />)
                )}
                {open.length > TASKS_SHOWN && (
                  <Link href="/corrective-actions" className="ds-row justify-between text-[15px] font-medium text-brand">
                    {open.length - TASKS_SHOWN} more {open.length - TASKS_SHOWN === 1 ? "task" : "tasks"}
                    <IconChevronRight width={18} height={18} />
                  </Link>
                )}
              </section>
            )}

            {show.has("inspect") && checklists.length > 0 && (
              <section aria-labelledby="checklists-head" className="flex flex-col">
                <div className="ds-sec">
                  <h2 id="checklists-head" className="eyebrow" style={sec}>
                    02 / Checklists
                  </h2>
                  <span className="eyebrow">Today</span>
                </div>
                {checklists.map((t) => (
                  <Link key={t.id} href={`/projects/${site.id}/inspections/new?templateId=${t.id}`} className="ds-row group">
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="text-base font-semibold group-hover:underline">{t.name}</span>
                      <span className="text-sm text-body">
                        {t.checklist.length} {t.checklist.length === 1 ? "check" : "checks"}
                      </span>
                    </span>
                    {doneToday.has(t.id) ? (
                      <span className="ds-tag ds-tag-good shrink-0">Done</span>
                    ) : (
                      <IconChevronRight width={18} height={18} className="shrink-0 text-muted" />
                    )}
                  </Link>
                ))}
              </section>
            )}
          </div>

          <YourSite site={site} now={now} />
        </div>
      )}
    </div>
  );
}

/** One number in the "today at a glance" strip: serif figure over a mono label. */
function Stat({ href, value, label, tone }: { href: string; value: number; label: string; tone?: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-1 border-r border-border px-3 py-3.5 first:pl-0 last:border-r-0 hover:bg-surface/60">
      <span className={`disp text-[32px] leading-none tabular-nums ${tone ?? ""}`}>{value}</span>
      <span className="eyebrow truncate group-hover:underline">{label}</span>
    </Link>
  );
}

/** 03 / Your site: who to call, the permits in force, and the way to the site page. */
function YourSite({ site, now }: { site: Project; now: number }) {
  const contacts = siteContacts(site).slice(0, 2);
  const permits = activePermits(site, now);

  return (
    <section aria-labelledby="site-head" className="flex flex-col">
      <div className="ds-sec">
        <h2 id="site-head" className="eyebrow" style={{ color: "var(--foreground)" }}>
          03 / Your site
        </h2>
        <Link href={`/projects/${site.id}`} className="eyebrow hover:underline">
          Details
        </Link>
      </div>

      {contacts.map(({ user: c, role }) => (
        <div key={c.id} className="flex min-h-16 items-center gap-3 border-b border-border">
          <Avatar person={c} size={36} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-medium">
              {c.firstName} {c.lastName}
            </span>
            <span className="truncate text-sm text-body">{role === "Safety manager" ? role : c.title}</span>
          </span>
          {c.phone && (
            <a
              href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
              aria-label={`Call ${c.firstName}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground/20 tone-good"
            >
              <IconPhone width={18} height={18} strokeWidth={2} />
            </a>
          )}
        </div>
      ))}

      <div className="flex flex-col py-3">
        <span className="eyebrow pb-1">Permits in force · {permits.length}</span>
        {permits.length === 0 ? (
          <span className="py-1.5 text-sm text-body">None right now</span>
        ) : (
          permits.slice(0, 3).map((p) => (
            <span key={p.id} className="flex min-h-10 items-center gap-3 text-sm">
              <span aria-hidden="true" className="ds-dot" style={{ background: "var(--status-warning)" }} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{p.type}</span>
                <span className="text-body">
                  {" "}
                  · {p.location.level} {p.location.zone}
                </span>
              </span>
              <span className="eyebrow shrink-0">until {clock(p.expiresAt)}</span>
            </span>
          ))
        )}
      </div>
    </section>
  );
}
