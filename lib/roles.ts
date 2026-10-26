import type { User, UserRole } from "@/lib/types";

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

export const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: `L${ROLE_INFO[r].level} · ${ROLE_INFO[r].label}` }));
