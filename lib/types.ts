export type UserRole =
  | "ADMIN"
  | "SAFETY_DIRECTOR"
  | "SAFETY_MANAGER"
  | "SUPERVISOR"
  | "WORKER"
  | "CLIENT_VIEWER";

export type User = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export type Company = {
  id: string;
  name: string;
};

export type ProjectStatus = "active" | "on_hold" | "closed";

export type Project = {
  id: string;
  companyId: string;
  name: string;
  projectNumber: string;
  location: string;
  client: string;
  startDate: string;
  status: ProjectStatus;
  riskScore: number;
};

export type EvidenceRequirement = "required" | "optional" | "disabled";

export type ChecklistItem = {
  id: string;
  label: string;
};

export type InspectionTemplate = {
  id: string;
  name: string;
  evidenceRequirement: EvidenceRequirement;
  aiAnalysisEnabled: boolean;
  checklist: ChecklistItem[];
};

export type ChecklistResponseValue = "pass" | "fail" | "na";

export type ChecklistResponse = {
  itemId: string;
  value: ChecklistResponseValue;
  note?: string;
};

export type Evidence = {
  id: string;
  fileName: string;
  dataUrl: string;
};

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ReviewerDecision = "pending" | "approved" | "overridden" | "rejected";

export type Finding = {
  id: string;
  inspectionId: string;
  hazardCategory: string;
  aiConfidence: number;
  riskLevel: RiskLevel;
  aiExplanation: string;
  regulatoryReference: string;
  reviewerDecision: ReviewerDecision;
  reviewerId?: string;
  overrideReason?: string;
  correctiveActionId?: string;
  createdAt: string;
};

export type InspectionStatus = "draft" | "submitted" | "reviewed";

export type Inspection = {
  id: string;
  projectId: string;
  templateId: string;
  inspectorId: string;
  date: string;
  status: InspectionStatus;
  responses: ChecklistResponse[];
  evidence: Evidence[];
  findingIds: string[];
};

export type CorrectiveActionStatus = "open" | "completed" | "verified" | "closed";

export type CorrectiveActionSource = "finding" | "infraction" | "manual";

export type CorrectiveAction = {
  id: string;
  projectId: string;
  source: CorrectiveActionSource;
  findingId?: string;
  description: string;
  assignedToId: string;
  dueDate: string;
  status: CorrectiveActionStatus;
  createdAt: string;
  completedAt?: string;
  verifiedAt?: string;
  closedAt?: string;
};

export type SessionPayload = {
  userId: string;
};
