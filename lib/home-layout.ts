import type { Company, User, UserRole } from "@/lib/types";

/**
 * What each role level sees, decided by the admin (Oct 9 review: a customisable
 * dashboard). A role layout picks which Home sections show, which number tiles
 * fill the "Key numbers" row, and whether the Compliance and Incidents areas
 * appear at all. Anything the admin hasn't set falls back to showing everything.
 */

export type ManagerSectionId =
  | "score"
  | "tiles"
  | "attention"
  | "insights"
  | "trend"
  | "hazards"
  | "heatmap"
  | "activity"
  | "compliance"
  | "projects";

export type WorkerSectionId = "hazard" | "tiles" | "inspect" | "tasks" | "certs" | "recent";

export type SectionId = ManagerSectionId | WorkerSectionId;

export type ModuleId = "compliance" | "incidents";

export type RoleLayout = {
  sections?: SectionId[];
  tiles?: string[];
  modules?: Partial<Record<ModuleId, boolean>>;
};

export const MANAGER_SECTIONS: { id: ManagerSectionId; label: string }[] = [
  { id: "score", label: "Safety score" },
  { id: "tiles", label: "Key numbers" },
  { id: "attention", label: "Needs your attention" },
  { id: "insights", label: "AI insights" },
  { id: "trend", label: "Findings vs. closures chart" },
  { id: "hazards", label: "What is going wrong" },
  { id: "heatmap", label: "Where findings happen (heat map)" },
  { id: "activity", label: "Live activity" },
  { id: "compliance", label: "Compliance summary" },
  { id: "projects", label: "Project health" },
];

export const WORKER_SECTIONS: { id: WorkerSectionId; label: string }[] = [
  { id: "hazard", label: "Report a hazard button" },
  { id: "tiles", label: "Overdue / tasks / certs tiles" },
  { id: "inspect", label: "Start an inspection" },
  { id: "tasks", label: "My tasks" },
  { id: "certs", label: "My certifications" },
  { id: "recent", label: "My recent inspections" },
];

export const MODULES: { id: ModuleId; label: string }[] = [
  { id: "compliance", label: "Compliance (training, permits, PPE, equipment, notices)" },
  { id: "incidents", label: "Incidents" },
];

export function sectionsCatalogFor(role: UserRole) {
  return role === "WORKER" ? WORKER_SECTIONS : MANAGER_SECTIONS;
}

export function layoutFor(company: Pick<Company, "roleLayouts"> | undefined, role: UserRole): RoleLayout {
  return company?.roleLayouts?.[role] ?? {};
}

/** Sections to render, in catalog order. */
export function visibleSections(company: Pick<Company, "roleLayouts"> | undefined, role: UserRole): Set<SectionId> {
  const chosen = layoutFor(company, role).sections;
  const all = sectionsCatalogFor(role).map((s) => s.id as SectionId);
  return new Set(chosen ? all.filter((id) => chosen.includes(id)) : all);
}

/**
 * L1 Admin always keeps every module, so an admin can never hide settings or
 * areas from themselves.
 */
export function moduleVisible(
  company: Pick<Company, "roleLayouts"> | undefined,
  user: Pick<User, "role">,
  module: ModuleId
): boolean {
  if (user.role === "ADMIN") return true;
  return layoutFor(company, user.role).modules?.[module] !== false;
}

export function hiddenModules(company: Pick<Company, "roleLayouts"> | undefined, user: Pick<User, "role">): ModuleId[] {
  return MODULES.map((m) => m.id).filter((id) => !moduleVisible(company, user, id));
}

/** Personal tile picks win only when the admin allows them; otherwise the role's tiles, then defaults. */
export function tileChoiceFor(company: Pick<Company, "roleLayouts" | "allowPersonalTiles"> | undefined, user: Pick<User, "role" | "dashboardTiles">): string[] | undefined {
  const personal = company?.allowPersonalTiles !== false && user.dashboardTiles?.length ? user.dashboardTiles : undefined;
  return personal ?? layoutFor(company, user.role).tiles;
}
