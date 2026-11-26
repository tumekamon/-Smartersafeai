import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { visibleSections } from "@/lib/home-layout";
import type { CheckIn, CorrectiveAction, Project, User } from "@/lib/types";
import { getCheckInForDay, getCompany, listCorrectiveActions, listInspections, listTemplates } from "@/lib/db";
import { checkInDay } from "@/lib/check-in";
import { certSummary } from "@/lib/worker-summary";
import { isOpenReport, myReports, type MyReport } from "@/lib/my-reports";
import { unreadCount } from "@/lib/notifications";
import { activePermits, siteContacts } from "@/lib/site";
import { greeting } from "@/lib/format";
import { isActionOverdue } from "@/lib/metrics";
import { daysLeft } from "@/lib/tasks";
import { TaskListRow } from "@/components/tasks/task-list";
import { NoSiteNotice } from "@/components/site/no-site-notice";
import { Avatar } from "@/components/ui/avatar";
import { Donut } from "@/components/viz/donut";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBell,
  IconCamera,
  IconCheck,
  IconChevronRight,
  IconClipboardCheck,
  IconClock,
  IconFileCheck,
  IconPhone,
  IconSiren,
} from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;
const TASKS_SHOWN = 5;
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * My Day for a worker, as a dashboard (CRM style, SmartSafe colours): a greeting, the
 * check-in when it's still to do, four stat cards, then cards for tasks, this week's
 * progress, today's checklists, the site and recent reports. One column on phones,
 * two then three on bigger screens.
 */
export function WorkerDashboard({ user, site }: { user: User; site?: Project }) {
  const now = nowMs();
  const show = visibleSections(getCompany(user.companyId), "WORKER");
  const checkIn = getCheckInForDay(user.companyId, user.id, checkInDay(now));
  const unread = unreadCount(user, now);

  const mine = listCorrectiveActions(user.companyId).filter((a) => a.assignedToId === user.id && a.projectId === site?.id);
  const rank = (a: CorrectiveAction) => (a.sentBack ? 0 : isActionOverdue(a) ? 1 : 2);
  const open = mine.filter((a) => a.status === "open").sort((a, b) => rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate));
  const overdue = open.filter((a) => isActionOverdue(a));
  const dueWeek = open.filter((a) => daysLeft(a, now) >= 0 && daysLeft(a, now) <= 7).length;
  const checking = mine.filter((a) => a.status === "completed");
  const fixedWeek = mine.filter(
    (a) => (a.status === "verified" || a.status === "closed") && now - Date.parse(a.verifiedAt ?? a.closedAt ?? a.createdAt) < 7 * DAY
  ).length;

  const certs = certSummary(user, now);
  const nextCert = certs.due[0];
  const nextCertDays = nextCert ? Math.round((Date.parse(nextCert.expiresOn) - now) / DAY) : 0;

  const today = checkInDay(now);
  const doneToday = new Set(
    listInspections(user.companyId)
      .filter((i) => i.inspectorId === user.id && i.projectId === site?.id && checkInDay(Date.parse(i.submittedAt)) === today)
      .map((i) => i.templateId)
  );
  const checklists = listTemplates(user.companyId).slice(0, 4);
  const reports = myReports(user).filter((r) => r.site.id === site?.id);

  const longDate = new Date(now).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const checkedIn = checkIn && checkIn.status !== "rejected";

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 sm:gap-6">
      {/* Header: date and site, greeting; on phones the emergency and bell icons sit here. */}
      <header className="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow truncate">
              {longDate}
              {site && ` · ${site.shortName}`}
            </span>
            <div className="-mr-2.5 flex shrink-0 items-center lg:hidden">
              {site && (
                <Link href="/emergency" aria-label="Emergency" className="flex h-11 w-11 items-center justify-center tone-critical">
                  <IconSiren width={22} height={22} strokeWidth={1.8} />
                </Link>
              )}
              <Link href="/notifications" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} className="relative flex h-11 w-11 items-center justify-center">
                <IconBell width={22} height={22} strokeWidth={1.7} />
                {unread > 0 && <span aria-hidden="true" className="absolute right-[11px] top-[10px] h-[7px] w-[7px] rounded-full bg-status-critical" />}
              </Link>
            </div>
          </div>
          <h1 className="disp text-[32px] leading-tight sm:text-[36px]">
            {greeting()}, {user.firstName}
          </h1>
          <p className="text-[15px] text-body">
            {open.length === 0 ? "Nothing on your list today. Have a safe shift." : `You have ${open.length} ${open.length === 1 ? "task" : "tasks"} open${overdue.length ? `, ${overdue.length} overdue` : ""}.`}
          </p>
        </div>
        {site && (
          <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
            {checkedIn && <CheckInChip checkIn={checkIn} />}
            <Link href={`/projects/${site.id}/inspections/new`} className="ds-btn ds-btn-outline min-h-11 px-5 text-[15px]">
              Start a checklist
            </Link>
          </div>
        )}
      </header>

      {!checkedIn && <CheckInCard rejected={checkIn} />}
      {checkedIn && (
        <div className="lg:hidden">
          <CheckInChip checkIn={checkIn} />
        </div>
      )}

      {!site && <NoSiteNotice action="check in, inspect or report on a site" />}

      {site && show.has("tiles") && (
        <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Stat
            href="/corrective-actions"
            label="Open tasks"
            value={open.length}
            Icon={IconClipboardCheck}
            foot={dueWeek ? `${dueWeek} due this week` : "Nothing due this week"}
          />
          <Stat
            href="/corrective-actions"
            label="Overdue"
            value={overdue.length}
            Icon={IconAlertTriangle}
            tone={overdue.length ? "critical" : "good"}
            foot={overdue.length ? `Oldest ${Math.abs(Math.min(...overdue.map((a) => daysLeft(a, now))))} days late` : "You're on time"}
          />
          <Stat
            href="/corrective-actions?tab=check"
            label="Being checked"
            value={checking.length}
            Icon={IconClock}
            foot={checking.length ? "Waiting for approval" : `${fixedWeek} approved this week`}
          />
          <Stat
            href="/settings/profile#certs"
            label="Certificates"
            value={`${certs.valid}/${certs.held.length}`}
            Icon={IconFileCheck}
            tone={certs.due.length ? "warning" : "good"}
            foot={nextCert ? `${nextCert.type} ${nextCertDays < 0 ? "expired" : `in ${nextCertDays}d`}` : "All current"}
          />
        </section>
      )}

      {site && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {show.has("tasks") && (
            <Card
              className="md:col-span-2"
              title="My tasks"
              sub={open.length ? `${open.length} open on ${site.shortName}` : "All caught up"}
              action={{ href: "/corrective-actions", label: "View all" }}
            >
              {open.length === 0 ? (
                <Empty Icon={IconCheck} text="Nothing to fix right now. New tasks from your supervisor show up here." />
              ) : (
                <ul className="-mx-4 -mb-4 divide-y divide-border border-t border-border sm:-mx-5 sm:-mb-5">
                  {open.slice(0, TASKS_SHOWN).map((a) => (
                    <li key={a.id}>
                      <TaskListRow task={a} now={now} compact />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card title="This week" sub="Your fixes, last 7 days">
            <WeekProgress fixed={fixedWeek} checking={checking.length} open={open.length - overdue.length} overdue={overdue.length} />
          </Card>

          {show.has("inspect") && (
            <Card title="Today's checklists" sub={`${doneToday.size} of ${checklists.length} done`} action={{ href: `/projects/${site.id}/inspections/new`, label: "All" }}>
              <ul className="-mx-2 flex flex-col">
                {checklists.map((t) => (
                  <li key={t.id}>
                    <Link href={`/projects/${site.id}/inspections/new?templateId=${t.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-muted">
                      <span className="wk-icon h-9 w-9 rounded-lg">
                        <IconFileCheck width={17} height={17} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-medium">{t.name}</span>
                        <span className="text-[13px] text-body">{t.checklist.length} checks</span>
                      </span>
                      {doneToday.has(t.id) ? (
                        <span className="ds-tag ds-tag-good">Done</span>
                      ) : (
                        <span className="text-sm font-semibold text-brand group-hover:underline">Start</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <SiteCard site={site} now={now} />

          <Card title="My reports" sub={`${reports.filter(isOpenReport).length} in progress`} action={{ href: "/my-reports", label: "View all" }}>
            {reports.length === 0 ? (
              <Empty Icon={IconCamera} text="Nothing reported yet. See something unsafe? Tap Report." />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {reports.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <ReportLine report={r} now={now} />
                  </li>
                ))}
              </ul>
            )}
            <Link href="/hazards/new" className="ds-btn ds-btn-yellow mt-3 min-h-11 w-full text-[15px]">
              Report a hazard
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function Card({
  title,
  sub,
  action,
  className = "",
  children,
}: {
  title: string;
  sub?: string;
  action?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`wk-card flex min-w-0 flex-col p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {sub && <p className="text-[13px] text-body">{sub}</p>}
        </div>
        {action && (
          <Link href={action.href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {action.label}
            <IconChevronRight width={15} height={15} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ Icon, text }: { Icon: ComponentType<SVGProps<SVGSVGElement>>; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
      <span className="wk-icon">
        <Icon width={19} height={19} />
      </span>
      <p className="max-w-xs text-sm text-body">{text}</p>
    </div>
  );
}

const STAT_TONE = {
  critical: { chip: "var(--status-critical)", value: "tone-critical" },
  warning: { chip: "var(--status-warning)", value: "tone-warning" },
  good: { chip: "var(--status-good)", value: "" },
} as const;

function Stat({
  href,
  label,
  value,
  Icon,
  foot,
  tone,
}: {
  href: string;
  label: string;
  value: number | string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  foot: string;
  tone?: keyof typeof STAT_TONE;
}) {
  const t = tone ? STAT_TONE[tone] : undefined;
  return (
    <Link href={href} className="wk-card group flex min-w-0 flex-col gap-3 p-4 transition-colors hover:border-brand/40 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-body sm:text-sm">{label}</span>
        <span
          className="wk-icon h-9 w-9 rounded-lg"
          style={t ? { color: t.chip, background: `color-mix(in srgb, ${t.chip} 13%, var(--surface))` } : undefined}
        >
          <Icon width={17} height={17} strokeWidth={2} />
        </span>
      </div>
      <span className={`disp text-[34px] leading-none tabular-nums ${t && tone !== "good" ? t.value : ""}`}>{value}</span>
      <span className="truncate text-[13px] text-body">{foot}</span>
    </Link>
  );
}

function CheckInCard({ rejected }: { rejected?: CheckIn }) {
  return (
    // Phones: icon beside the text, the button full width underneath (thumb reach).
    // From sm: one row, the button on the right.
    <Link href="/check-in" className="group flex flex-col gap-4 rounded-2xl bg-[#0F4C81] p-4 text-white sm:flex-row sm:items-center sm:p-6">
      <span className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center sm:gap-4">
        <span className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12">
          <IconCamera width={22} height={22} strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#DCEBF7]">
            {rejected ? "Not accepted · do it again" : "Before you start"}
          </span>
          <span className="text-lg font-semibold leading-tight">PPE check-in</span>
          <span className="text-sm text-[#DCEBF7]">{rejected?.reviewNote ?? "A photo in your PPE, on site. It takes a minute."}</span>
        </span>
      </span>
      <span className="ds-btn min-h-12 w-full shrink-0 whitespace-nowrap bg-white px-5 text-[15px] text-[#0F4C81] transition-transform sm:min-h-11 sm:w-auto sm:group-hover:translate-x-0.5">
        Check in now <IconArrowRight width={16} height={16} strokeWidth={2.2} />
      </span>
    </Link>
  );
}

function CheckInChip({ checkIn }: { checkIn: CheckIn }) {
  const ok = checkIn.status === "approved";
  return (
    <Link href="/check-in" className={`ds-tag ${ok ? "ds-tag-good" : "ds-tag-warn"} min-h-9 gap-1.5 px-3`}>
      {ok ? <IconCheck width={13} height={13} strokeWidth={2.6} /> : <IconClock width={13} height={13} />}
      Checked in {time(checkIn.capturedAt)}
      {!ok && " · being checked"}
    </Link>
  );
}

function WeekProgress({ fixed, checking, open, overdue }: { fixed: number; checking: number; open: number; overdue: number }) {
  const segs = [
    { label: "Approved", value: fixed, color: "var(--status-good)" },
    { label: "Being checked", value: checking, color: "var(--brand)" },
    { label: "To do", value: open, color: "var(--status-warning)" },
    { label: "Overdue", value: overdue, color: "var(--status-critical)" },
  ];
  const total = segs.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex flex-1 flex-wrap items-center justify-center gap-5 xl:gap-6">
      <div className="shrink-0">
        <Donut segments={total ? segs : [{ label: "None", value: 1, color: "var(--border)" }]} size={128} stroke={14} center={String(fixed)} caption="approved" />
      </div>
      <ul className="flex min-w-[10rem] flex-1 flex-col gap-2">
        {segs.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 text-body">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SiteCard({ site, now }: { site: Project; now: number }) {
  const contacts = siteContacts(site).slice(0, 2);
  const permits = activePermits(site, now);
  return (
    <Card title={site.shortName} sub={site.location} action={{ href: `/projects/${site.id}`, label: "Details" }}>
      <div className="grid grid-cols-2 gap-2">
        <a href="tel:911" className="ds-btn min-h-11 gap-1.5 bg-status-critical px-3 text-[15px] text-white">
          <IconPhone width={16} height={16} strokeWidth={2.2} /> 911
        </a>
        <Link href="/emergency" className="ds-btn min-h-11 gap-1.5 border-[1.5px] border-status-critical/35 px-3 text-[15px] tone-critical">
          <IconSiren width={16} height={16} /> Emergency
        </Link>
      </div>
      <ul className="mt-3 flex flex-col">
        {contacts.map(({ user: c, role }) => (
          <li key={c.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
            <Avatar person={c} size={34} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">
                {c.firstName} {c.lastName}
              </span>
              <span className="truncate text-[13px] text-body">{role}</span>
            </span>
            {c.phone && (
              <a
                href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                aria-label={`Call ${c.firstName}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border tone-good hover:bg-surface-muted"
              >
                <IconPhone width={16} height={16} strokeWidth={2} />
              </a>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 rounded-xl bg-surface-muted px-3 py-2.5">
        <p className="flex items-center justify-between text-[13px]">
          <span className="font-medium">Permits in force</span>
          <span className="font-semibold tabular-nums">{permits.length}</span>
        </p>
        {permits.slice(0, 2).map((p) => (
          <p key={p.id} className="mt-1 flex items-center justify-between gap-2 text-[13px] text-body">
            <span className="truncate">
              {p.type} · {p.location.level} {p.location.zone}
            </span>
            <span className="shrink-0 tabular-nums">until {time(p.expiresAt)}</span>
          </p>
        ))}
      </div>
    </Card>
  );
}

const STAGE_TAG: Record<string, { label: string; cls: string }> = {
  sent: { label: "In review", cls: "ds-tag-info" },
  confirmed: { label: "Confirmed", cls: "ds-tag-info" },
  fixing: { label: "Being fixed", cls: "ds-tag-warn" },
  fixed: { label: "Fixed", cls: "ds-tag-good" },
  not_taken: { label: "No fix needed", cls: "ds-tag-neutral" },
  open: { label: "Reported", cls: "ds-tag-info" },
  investigating: { label: "Investigating", cls: "ds-tag-neutral" },
  closed: { label: "Closed", cls: "ds-tag-good" },
};

function ReportLine({ report: r, now }: { report: MyReport; now: number }) {
  const tag = STAGE_TAG[r.kind === "hazard" ? r.stage : r.incident.status];
  const title = r.kind === "hazard" ? r.finding.title : r.incident.description;
  const days = Math.floor((now - Date.parse(r.at)) / DAY);
  return (
    <Link href={`/my-reports?r=${r.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-muted">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">{title}</span>
        <span className="text-[13px] text-body">
          {r.kind === "incident" ? "Incident · " : ""}
          {days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`}
        </span>
      </span>
      <span className={`ds-tag ${tag.cls} shrink-0`}>{tag.label}</span>
    </Link>
  );
}
