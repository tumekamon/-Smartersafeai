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
  title: string;
  active: boolean;
  featured?: boolean;
};

export type Company = {
  id: string;
  name: string;
  primaryColor: string;
  hazardCategories: string[];
};

export type ProjectStatus = "active" | "on_hold" | "closed";

export type Project = {
  id: string;
  companyId: string;
  name: string;
  shortName: string;
  projectNumber: string;
  location: string;
  client: string;
  startDate: string;
  status: ProjectStatus;
  percentComplete: number;
  headcount: number;
  levels: string[];
  zones: string[];
  crewIds: string[];
};

export type SiteLocation = {
  level: string;
  zone: string;
};

export type EvidenceRequirement = "required" | "optional" | "disabled";

export type SceneKind = "panel" | "cord" | "vest" | "egress" | "ladder" | "lift" | "generic";

/** Free-form: each company defines its own set on Company.hazardCategories. */
export type HazardCategory = string;

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type HazardProfile = {
  category: HazardCategory;
  title: string;
  regulatoryReference: string;
  risk: RiskLevel;
  scene: SceneKind;
  narrative: string;
  remedy: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  hazard: HazardProfile;
};

export type InspectionTemplate = {
  id: string;
  companyId: string;
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
  /** Rendered site-camera illustration for seeded evidence. */
  scene?: SceneKind;
  /** Real uploaded image, when a user attached one. */
  dataUrl?: string;
  capturedAt: string;
};

export type ReviewerDecision = "pending" | "approved" | "overridden" | "rejected";

export type Finding = {
  id: string;
  inspectionId: string;
  projectId: string;
  location: SiteLocation;
  hazardCategory: HazardCategory;
  title: string;
  aiConfidence: number;
  riskLevel: RiskLevel;
  aiExplanation: string;
  regulatoryReference: string;
  scene?: SceneKind;
  evidenceId?: string;
  reviewerDecision: ReviewerDecision;
  reviewerId?: string;
  reviewedAt?: string;
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
  location: SiteLocation;
  date: string;
  submittedAt: string;
  status: InspectionStatus;
  responses: ChecklistResponse[];
  evidence: Evidence[];
  findingIds: string[];
  assetTag?: string;
};

export type CorrectiveActionStatus = "open" | "completed" | "verified" | "closed";

export type CorrectiveActionSource = "finding" | "infraction" | "manual";

export type CorrectiveAction = {
  id: string;
  projectId: string;
  source: CorrectiveActionSource;
  findingId?: string;
  category: HazardCategory;
  priority: RiskLevel;
  location?: SiteLocation;
  description: string;
  assignedToId: string;
  dueDate: string;
  status: CorrectiveActionStatus;
  createdAt: string;
  completedAt?: string;
  verifiedAt?: string;
  closedAt?: string;
};

export type CertificationType =
  | "Electrical Safety (NFPA 70E)"
  | "LOTO Authorized"
  | "Fall Protection"
  | "Aerial Lift Operator"
  | "First Aid / CPR"
  | "HAZCOM";

export type Certification = {
  id: string;
  userId: string;
  type: CertificationType;
  issuedOn: string;
  expiresOn: string;
};

export type PermitType = "Hot Work" | "Confined Space" | "Excavation" | "Energized Work";

export type Permit = {
  id: string;
  projectId: string;
  type: PermitType;
  location: SiteLocation;
  description: string;
  issuedById: string;
  approvedById: string;
  attendantId?: string;
  startsAt: string;
  expiresAt: string;
  closedAt?: string;
};

export type PpeItem = {
  id: string;
  companyId: string;
  name: string;
  received: number;
  issued: number;
  reorderPoint: number;
  unitCost: number;
};

export type Asset = {
  id: string;
  tag: string;
  name: string;
  projectId: string;
};

export type GcNoticePriority = "low" | "medium" | "high";
export type GcNoticeStatus = "open" | "acknowledged" | "resolved";

export type GcNotice = {
  id: string;
  projectId: string;
  trade: string;
  issue: string;
  impact: string;
  priority: GcNoticePriority;
  status: GcNoticeStatus;
  raisedAt: string;
  raisedById: string;
  gcResponse?: string;
};

export type SessionPayload = {
  userId: string;
};
