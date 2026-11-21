import "server-only";
import { getInspection, getUser, listCorrectiveActions, listFindings, listIncidents } from "@/lib/db";
import { accessibleProject } from "@/lib/scope";
import type { CorrectiveAction, Evidence, Finding, Incident, Project, User } from "@/lib/types";

/** Where a worker's hazard report has got to, in the order it moves. */
export type HazardStage = "sent" | "confirmed" | "fixing" | "fixed" | "not_taken";

export type MyHazardReport = {
  kind: "hazard";
  id: string;
  at: string;
  site: Project;
  finding: Finding;
  photo?: Evidence;
  stage: HazardStage;
  reviewer?: Pick<User, "firstName" | "lastName">;
  fix?: { task: CorrectiveAction; assignee?: Pick<User, "firstName" | "lastName"> };
};

export type MyIncidentReport = { kind: "incident"; id: string; at: string; site: Project; incident: Incident };

export type MyReport = MyHazardReport | MyIncidentReport;

const person = (id?: string) => {
  const u = id ? getUser(id) : undefined;
  return u ? { firstName: u.firstName, lastName: u.lastName } : undefined;
};

/**
 * Everything this person reported themselves (hazards from site, and incidents) on the
 * sites they are still on, newest first, with where each one has got to. Never shows
 * anyone else's reports, and nothing from a site they've left.
 */
export function myReports(user: User): MyReport[] {
  const tasks = new Map(listCorrectiveActions(user.companyId).map((a) => [a.id, a]));
  const out: MyReport[] = [];

  for (const f of listFindings(user.companyId)) {
    if (f.source !== "field") continue;
    const inspection = getInspection(f.inspectionId);
    if (!inspection || inspection.inspectorId !== user.id) continue;
    const site = accessibleProject(user, f.projectId);
    if (!site) continue;
    const task = f.correctiveActionId ? tasks.get(f.correctiveActionId) : undefined;
    const stage: HazardStage =
      f.reviewerDecision === "pending"
        ? "sent"
        : f.reviewerDecision === "rejected"
          ? "not_taken"
          : !task
            ? "confirmed"
            : task.status === "verified" || task.status === "closed"
              ? "fixed"
              : "fixing";
    out.push({
      kind: "hazard",
      id: f.id,
      at: f.createdAt,
      site,
      finding: f,
      photo: inspection.evidence.find((e) => e.id === f.evidenceId) ?? inspection.evidence[0],
      stage,
      reviewer: person(f.reviewerId),
      fix: task ? { task, assignee: person(task.assignedToId) } : undefined,
    });
  }

  for (const i of listIncidents(user.companyId)) {
    if (i.reportedById !== user.id) continue;
    const site = accessibleProject(user, i.projectId);
    if (site) out.push({ kind: "incident", id: i.id, at: i.reportedAt, site, incident: i });
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Reports still moving (not fixed, not closed, not turned down). */
export const isOpenReport = (r: MyReport) =>
  r.kind === "hazard" ? r.stage === "sent" || r.stage === "confirmed" || r.stage === "fixing" : r.incident.status !== "closed";
