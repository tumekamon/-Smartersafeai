import "server-only";
import type { ExtraPermission, User, UserRole } from "@/lib/types";

/**
 * Capability model for the four role levels (lib/roles.ts) plus the read-only switch.
 * "AI assists -> qualified human evaluates" means finding review is reserved for
 * safety professionals (L1 Admin / L2 Safety Manager), not every role.
 * Corrective actions split "completed" (the assignee did the work) from "verified"
 * (a safety professional confirmed it) so a worker can never self-certify a fix —
 * this is the capstone paper's "prevents an employee from marking an issue complete
 * without safety verification" principle.
 */

export type Capabilities = {
  role: UserRole;
  canSubmitInspections: boolean;
  canReviewFindings: boolean;
  canCreateCorrectiveActions: boolean;
  canCompleteOwnActions: boolean;
  canVerifyActions: boolean;
  canCloseActions: boolean;
  canViewOrgDashboard: boolean;
  canViewReports: boolean;
  canCustomizeDashboard: boolean;
  canManageCompliance: boolean;
  canManageTemplates: boolean;
  canManageCrews: boolean;
  canManageSettings: boolean;
  isReadOnly: boolean;
};

export function getCapabilities(user: Pick<User, "role" | "readOnly" | "extraPermissions">): Capabilities {
  const { role } = user;
  const isReadOnly = user.readOnly === true;
  const isSafetyProfessional = !isReadOnly && (role === "ADMIN" || role === "SAFETY_MANAGER");
  const isFieldLead = !isReadOnly && role === "SUPERVISOR";
  // Per-person extras never apply to a read-only account.
  const extra = (p: ExtraPermission) => !isReadOnly && (user.extraPermissions ?? []).includes(p);

  return {
    role,
    canSubmitInspections: !isReadOnly,
    canReviewFindings: isSafetyProfessional || extra("review"),
    canCreateCorrectiveActions: isSafetyProfessional || isFieldLead || extra("fixes"),
    canCompleteOwnActions: !isReadOnly,
    canVerifyActions: isSafetyProfessional || isFieldLead || extra("fixes"),
    canCloseActions: isSafetyProfessional || extra("review"),
    canViewOrgDashboard: isSafetyProfessional || isFieldLead,
    // Clients get reports too: a read-only summary is exactly what they ask for.
    canViewReports: isSafetyProfessional || isFieldLead || isReadOnly,
    canCustomizeDashboard: isSafetyProfessional,
    canManageCompliance: isSafetyProfessional || isFieldLead || extra("compliance"),
    // Foremen build their own daily checklists (Oct 9 review), so L3 edits templates too.
    canManageTemplates: isSafetyProfessional || isFieldLead || extra("templates"),
    // Who works on which site: L1/L2 keep crews current.
    canManageCrews: isSafetyProfessional,
    canManageSettings: !isReadOnly && role === "ADMIN",
    isReadOnly,
  };
}
