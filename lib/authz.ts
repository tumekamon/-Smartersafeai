import "server-only";
import type { UserRole } from "@/lib/types";

/**
 * Capability model for the six roles from resources/chatgpt_transcript.md.
 * "AI assists -> qualified human evaluates" means finding review is reserved for
 * safety professionals (Admin / Safety Director / Safety Manager), not every role.
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
  isReadOnly: boolean;
};

export function getCapabilities(role: UserRole): Capabilities {
  const isSafetyProfessional = role === "ADMIN" || role === "SAFETY_DIRECTOR" || role === "SAFETY_MANAGER";
  const isFieldLead = role === "SUPERVISOR";
  const isClientViewer = role === "CLIENT_VIEWER";

  return {
    role,
    canSubmitInspections: !isClientViewer,
    canReviewFindings: isSafetyProfessional,
    canCreateCorrectiveActions: isSafetyProfessional || isFieldLead,
    canCompleteOwnActions: !isClientViewer,
    canVerifyActions: isSafetyProfessional || isFieldLead,
    canCloseActions: isSafetyProfessional,
    canViewOrgDashboard: isSafetyProfessional || isFieldLead,
    isReadOnly: isClientViewer,
  };
}
