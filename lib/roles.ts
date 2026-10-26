import type { ExtraPermission, User, UserRole } from "@/lib/types";

/**
 * Four standard role levels, applied the same way on every project (agreed in the
 * Oct 9 2026 review with Lawrence Kibet). Client access is not a fifth level: it is a
 * read-only switch on an account (`User.readOnly`).
 */

export const ROLES: UserRole[] = ["ADMIN", "SAFETY_MANAGER", "SUPERVISOR", "WORKER"];

export const ROLE_INFO: Record<UserRole, { level: number; label: string; summary: string }> = {
  ADMIN: { level: 1, label: "Admin", summary: "Company setup, users, templates, all sites" },
  SAFETY_MANAGER: { level: 2, label: "Safety Manager", summary: "Reviews AI findings, closes issues, all sites" },
  SUPERVISOR: { level: 3, label: "Supervisor", summary: "Assigns and verifies fixes on their sites" },
  WORKER: { level: 4, label: "Worker", summary: "Reports hazards, runs checklists, does tasks" },
};

export function roleLabel(user: Pick<User, "role" | "readOnly">) {
  return user.readOnly ? "Client · read-only" : `L${ROLE_INFO[user.role].level} · ${ROLE_INFO[user.role].label}`;
}

/** Rights an admin can add to one person without changing their level. */
export const EXTRA_PERMISSIONS: { id: ExtraPermission; label: string }[] = [
  { id: "templates", label: "Make checklists" },
  { id: "fixes", label: "Assign & verify fixes" },
  { id: "review", label: "Review AI findings" },
  { id: "compliance", label: "Manage compliance" },
];

/** Extras a level already includes, so the Team page only offers the ones that add something. */
export const ROLE_INCLUDES: Record<UserRole, ExtraPermission[]> = {
  ADMIN: ["templates", "fixes", "review", "compliance"],
  SAFETY_MANAGER: ["templates", "fixes", "review", "compliance"],
  SUPERVISOR: ["templates", "fixes", "compliance"],
  WORKER: [],
};

export const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: `L${ROLE_INFO[r].level} · ${ROLE_INFO[r].label}` }));
