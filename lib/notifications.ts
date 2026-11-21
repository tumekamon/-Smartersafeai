import "server-only";
import { getInboxSeen, getProject, listCertificationRecords, listCheckIns, listCorrectiveActions } from "@/lib/db";
import { certificationSlots } from "@/lib/certifications";
import { checkInDay } from "@/lib/check-in";
import { myReports } from "@/lib/my-reports";
import { accessibleProject } from "@/lib/scope";
import { daysLeft, PRIORITY, taskTitle } from "@/lib/tasks";
import type { User } from "@/lib/types";

const DAY = 86_400_000;
const WINDOW = 30 * DAY;

export type NoticeTone = "critical" | "warning" | "good" | "info";

export type Notice = {
  id: string;
  tone: NoticeTone;
  kind: "task" | "check-in" | "certificate" | "report";
  title: string;
  body?: string;
  href: string;
  at: string;
};

/**
 * A worker's notifications, worked out from what already happened to their own things:
 * tasks given to them, sent back or approved; their check-in and certificate reviews;
 * expiring certificates; and what became of the hazards and incidents they reported.
 *
 * Nothing needs to "send" a notification: any screen that changes those records (the
 * supervisor and safety-manager side included) shows up here on its own. Only things
 * on the person's own sites, about them, from the last 30 days.
 */
export function noticesFor(user: User, now = Date.now()): Notice[] {
  const out: Notice[] = [];
  const recent = (iso?: string) => !!iso && now - Date.parse(iso) < WINDOW && Date.parse(iso) <= now;

  // Tasks ------------------------------------------------------------------
  for (const a of listCorrectiveActions(user.companyId)) {
    if (a.assignedToId !== user.id) continue;
    const site = accessibleProject(user, a.projectId);
    if (!site) continue;
    const href = `/corrective-actions/${a.id}`;
    const title = taskTitle(a);
    if (a.assignedById !== user.id && recent(a.createdAt)) {
      out.push({
        id: `task-new-${a.id}`,
        tone: a.priority === "critical" ? "critical" : "info",
        kind: "task",
        title: `New task: ${title}`,
        body: `${site.shortName} · ${PRIORITY[a.priority].label} · ${PRIORITY[a.priority].within.toLowerCase()}`,
        href,
        at: a.createdAt,
      });
    }
    if (a.status === "open" && a.sentBack && recent(a.sentBack.at)) {
      out.push({ id: `task-back-${a.id}-${a.sentBack.at}`, tone: "critical", kind: "task", title: `Sent back: ${title}`, body: a.sentBack.note, href, at: a.sentBack.at });
    }
    if (a.verifiedAt && recent(a.verifiedAt)) {
      out.push({ id: `task-ok-${a.id}`, tone: "good", kind: "task", title: `Fix approved: ${title}`, body: site.shortName, href, at: a.verifiedAt });
    }
    if (a.status === "open") {
      const left = daysLeft(a, now);
      const due = new Date(a.dueDate).getTime();
      if (left < 0) {
        out.push({ id: `task-late-${a.id}`, tone: "critical", kind: "task", title: `Overdue: ${title}`, body: `Was due ${new Date(due).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}. Fix it or call your supervisor.`, href, at: new Date(due + DAY).toISOString() });
      } else if (left === 0) {
        out.push({ id: `task-today-${a.id}`, tone: "warning", kind: "task", title: `Due today: ${title}`, body: site.shortName, href, at: new Date(due).toISOString() });
      }
    }
  }

  // Check-ins: a turned-down one always; an approval only for today. -------
  const today = checkInDay(now);
  for (const c of listCheckIns(user.companyId, { userId: user.id })) {
    if (!c.reviewedAt || !recent(c.reviewedAt)) continue;
    const site = getProject(c.projectId)?.shortName ?? "";
    if (c.status === "rejected") {
      out.push({
        id: `ci-${c.id}`,
        tone: "critical",
        kind: "check-in",
        title: "Check-in not accepted",
        body: c.reviewNote ?? "Check in again with all your PPE showing.",
        href: c.day === today ? "/check-in" : "/dashboard",
        at: c.reviewedAt,
      });
    } else if (c.status === "approved" && c.day === today) {
      out.push({ id: `ci-${c.id}`, tone: "good", kind: "check-in", title: "Check-in approved", body: `You're cleared to work today at ${site}.`, href: "/dashboard", at: c.reviewedAt });
    }
  }

  // Certificates -------------------------------------------------------------
  const records = listCertificationRecords(user.companyId, { userId: user.id });
  for (const c of records) {
    if (c.submittedById !== user.id || !c.reviewedAt || !recent(c.reviewedAt)) continue;
    out.push(
      c.review === "rejected"
        ? { id: `cert-${c.id}`, tone: "critical", kind: "certificate", title: `Certificate not accepted: ${c.type}`, body: c.reviewNote, href: "/settings/profile#certs", at: c.reviewedAt }
        : { id: `cert-${c.id}`, tone: "good", kind: "certificate", title: `Certificate accepted: ${c.type}`, body: `Valid until ${fmtDay(c.expiresOn)}.`, href: "/settings/profile#certs", at: c.reviewedAt }
    );
  }
  for (const slot of certificationSlots(records)) {
    const cur = slot.current;
    if (!cur || slot.pending) continue;
    const expires = Date.parse(cur.expiresOn);
    const warnFrom = expires - 30 * DAY;
    if (expires < now && recent(cur.expiresOn)) {
      out.push({ id: `cert-exp-${cur.id}`, tone: "critical", kind: "certificate", title: `${cur.type} has expired`, body: "Upload your renewed certificate so you can keep doing this work.", href: "/settings/profile#certs", at: new Date(expires).toISOString() });
    } else if (expires >= now && warnFrom <= now) {
      const d = Math.max(0, Math.ceil((expires - now) / DAY));
      out.push({ id: `cert-soon-${cur.id}`, tone: "warning", kind: "certificate", title: `${cur.type} expires in ${d} day${d === 1 ? "" : "s"}`, body: "Book the renewal and upload the new certificate here.", href: "/settings/profile#certs", at: new Date(warnFrom).toISOString() });
    }
  }

  // What became of the hazards and incidents they reported -------------------
  for (const r of myReports(user)) {
    const href = `/my-reports#${r.id}`;
    if (r.kind === "incident") {
      if (r.incident.closedAt && recent(r.incident.closedAt)) {
        out.push({ id: `inc-${r.id}`, tone: "good", kind: "report", title: "Incident report closed", body: r.incident.description, href, at: r.incident.closedAt });
      }
      continue;
    }
    const f = r.finding;
    if (f.reviewedAt && recent(f.reviewedAt)) {
      out.push(
        r.stage === "not_taken"
          ? { id: `rep-${f.id}`, tone: "info", kind: "report", title: "Your hazard report was reviewed", body: f.overrideReason ?? "No fix was needed this time. Thanks for reporting it.", href, at: f.reviewedAt }
          : { id: `rep-${f.id}`, tone: "info", kind: "report", title: "Your hazard report was confirmed", body: r.fix ? `${r.fix.assignee?.firstName ?? "Someone"} has been given the fix.` : f.title, href, at: f.reviewedAt }
      );
    }
    const done = r.fix?.task.verifiedAt;
    if (r.stage === "fixed" && done && recent(done)) {
      out.push({ id: `rep-fixed-${f.id}`, tone: "good", kind: "report", title: "A hazard you reported is fixed", body: f.title, href, at: done });
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
}

/**
 * Since when notifications count as new: when the person last opened the list, or for
 * someone who never has, the last 3 days (so a first sign-in isn't a wall of red).
 */
export function seenSince(user: User, now = Date.now()): string {
  return getInboxSeen(user.id) ?? new Date(now - 3 * DAY).toISOString();
}

/** How many came in since the person last opened their notifications. */
export function unreadCount(user: User, now = Date.now()): number {
  const seen = seenSince(user, now);
  return noticesFor(user, now).filter((n) => n.at > seen).length;
}

const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
