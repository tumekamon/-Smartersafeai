import "server-only";
import type { User, UserRole } from "@/lib/types";

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
  canCustomizeDashboard: boolean;
  canManageCompliance: boolean;
  canManageTemplates: boolean;
  canManageSettings: boolean;
  isReadOnly: boolean;
};

export function getCapabilities(user: Pick<User, "role" | "readOnly">): Capabilities {
  const { role } = user;
  const isReadOnly = user.readOnly === true;
  const isSafetyProfessional = !isReadOnly && (role === "ADMIN" || role === "SAFETY_MANAGER");
  const isFieldLead = !isReadOnly && role === "SUPERVISOR";

  return {
    role,
    canSubmitInspections: !isReadOnly,
    canReviewFindings: isSafetyProfessional,
    canCreateCorrectiveActions: isSafetyProfessional || isFieldLead,
    canCompleteOwnActions: !isReadOnly,
    canVerifyActions: isSafetyProfessional || isFieldLead,
    canCloseActions: isSafetyProfessional,
    canViewOrgDashboard: isSafetyProfessional || isFieldLead,
    canCustomizeDashboard: isSafetyProfessional,
    canManageCompliance: isSafetyProfessional || isFieldLead,
    // Foremen build their own daily checklists (Oct 9 review), so L3 edits templates too.
    canManageTemplates: isSafetyProfessional || isFieldLead,
    canManageSettings: !isReadOnly && role === "ADMIN",
    isReadOnly,
  };
}
