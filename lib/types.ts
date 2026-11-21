import type { RoleLayout } from "@/lib/home-layout";

/** Four role levels: L1 Admin, L2 Safety Manager, L3 Supervisor, L4 Worker (see lib/roles.ts). */
export type UserRole = "ADMIN" | "SAFETY_MANAGER" | "SUPERVISOR" | "WORKER";

export type ExtraPermission = "templates" | "fixes" | "review" | "compliance";

export type User = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  title: string;
  /** Work phone, shown to crew as a call button. */
  phone?: string;
  active: boolean;
  /** Read-only access (e.g. a client) — can view, never change anything. */
  readOnly?: boolean;
  /**
   * Extra rights on top of the role level, for people who wear two hats
   * (a worker who is also a foreman, a PM who is also technical director).
   */
  extraPermissions?: ExtraPermission[];
  /** Home-screen tiles this user picked; unset means the defaults. */
  dashboardTiles?: string[];
  featured?: boolean;
};

export type Company = {
  id: string;
  name: string;
  primaryColor: string;
  heroImage?: string;
  hazardCategories: string[];
  /** What each role level sees on Home and in the menu, set by the admin (lib/home-layout.ts). */
  roleLayouts?: Partial<Record<UserRole, RoleLayout>>;
  /** When false, everyone sees their role's tiles and nobody can pick their own. Default true. */
  allowPersonalTiles?: boolean;
  /** The company's own questions added to the incident report, in order. */
  incidentFields?: IncidentField[];
};

export type IncidentField = {
  id: string;
  label: string;
  kind: "text" | "choice" | "yesno";
  options?: string[];
  required: boolean;
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
  /** Site boundary for the daily check-in: a centre point and radius. Unset = location is recorded but not enforced. */
  geofence?: Geofence;
  /** What a worker needs in an emergency on this site. Shown on the worker's Emergency screen. */
  emergency?: SiteEmergency;
};

export type SiteEmergency = {
  /** Site emergency line (gate, site office or GC safety). 911 is always shown as well. */
  sitePhone?: string;
  /** Where everyone gathers in an evacuation. */
  musterPoint?: string;
  /** Where the first-aid kit, eyewash and AED are kept. */
  firstAidStation?: string;
  hospital?: { name: string; address: string; phone?: string };
  /** Street address to give the 911 dispatcher (gate or entrance). */
  siteAddress?: string;
};

export type Geofence = {
  lat: number;
  lng: number;
  radiusM: number;
};

export type CheckInStatus = "pending" | "approved" | "rejected";

/**
 * A worker's start-of-day check-in: a live camera photo showing their PPE, taken on
 * site. One per worker per day; a rejected one can be redone. Reviewed by the
 * site's supervisor or a safety manager (see docs/daily-check-in.md).
 */
export type CheckIn = {
  id: string;
  companyId: string;
  userId: string;
  projectId: string;
  /** Calendar day the check-in counts for, YYYY-MM-DD in server time. */
  day: string;
  photo: Evidence;
  /** When the photo was taken, worked out on the server (receive time minus how long ago the phone says it was taken). */
  capturedAt: string;
  submittedAt: string;
  position: { lat: number; lng: number; accuracyM: number };
  /** Metres from the site centre; undefined when the site has no boundary set. */
  distanceM?: number;
  /** "inside" = within the boundary; "no_boundary" = site has none, so it could not be checked. */
  locationCheck: "inside" | "no_boundary";
  /** PPE items the worker confirmed they are wearing. */
  ppeConfirmed: string[];
  status: CheckInStatus;
  reviewedById?: string;
  reviewedAt?: string;
  /** Required when rejecting, shown to the worker. */
  reviewNote?: string;
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
  /** Built-in template (e.g. quick hazard reports): hidden from pickers and settings. */
  system?: boolean;
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
  /** "field" = a person reported it from site; otherwise the AI raised it from an inspection. */
  source?: "ai" | "field";
  /** What the (simulated) photo check saw on a site report, shown next to the person's own words. */
  photoCheck?: { label: string; confidence: number; simulated: true };
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
  /** Who gave the task out (supervisor or safety manager). */
  assignedById?: string;
  /**
   * Whether marking it fixed needs a photo. Missing means the default for the source:
   * required for hazard fixes and equipment checks, optional for assigned jobs.
   */
  proof?: EvidenceRequirement;
  /** Proof of the fix, added by the person who marked it done. */
  completionPhoto?: Evidence;
  completionNote?: string;
  completedById?: string;
  /** Set when a checker sent the fix back to be redone; cleared when it's done again. */
  sentBack?: { note: string; byId: string; at: string };
};

export type CertificationType =
  | "Electrical Safety (NFPA 70E)"
  | "LOTO Authorized"
  | "Fall Protection"
  | "Aerial Lift Operator"
  | "First Aid / CPR"
  | "HAZCOM";

/** "verified" counts toward compliance; a worker's own upload starts as "pending". */
export type CertificationReview = "verified" | "pending" | "rejected";

export type Certification = {
  id: string;
  userId: string;
  type: CertificationType;
  issuedOn: string;
  expiresOn: string;
  /** Number printed on the card, if any. */
  certificateNo?: string;
  /** Training provider or body that issued it. */
  issuer?: string;
  /** Photo or PDF of the certificate. Records logged by a manager may have none. */
  document?: Evidence & { mimeType: string; sizeBytes: number };
  /** Missing means verified (logged by a manager, or seeded). */
  review?: CertificationReview;
  submittedById?: string;
  submittedAt?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type PermitType = "Hot Work" | "Confined Space" | "Excavation" | "Energized Work";

export type Permit = {
  id: string;
  projectId: string;
  type: PermitType;
  location: SiteLocation;
  description: string;
  issuedById: string;
  approvedById?: string;
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
  category?: string;
};

export type IncidentType = "near_miss" | "first_aid" | "recordable" | "property_damage" | "illness";
export type IncidentStatus = "open" | "investigating" | "closed";

export type Incident = {
  id: string;
  projectId: string;
  type: IncidentType;
  description: string;
  location: SiteLocation;
  involvedUserIds: string[];
  immediateAction: string;
  oshaRecordable: boolean;
  lostTimeDays: number;
  status: IncidentStatus;
  reportedById: string;
  reportedAt: string;
  closedAt?: string;
  /** Answers to the company's own incident questions, keyed by field id. */
  customAnswers?: Record<string, string>;
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
  /** Issued-at and expiry, ms since epoch. */
  iat: number;
  exp: number;
};
