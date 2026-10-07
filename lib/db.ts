import "server-only";
import { buildSeed, type Store } from "@/lib/seed";
import type {
  Asset,
  Certification,
  ChecklistItem,
  ChecklistResponse,
  Company,
  CorrectiveAction,
  CorrectiveActionStatus,
  EvidenceRequirement,
  Evidence,
  Finding,
  GcNotice,
  HazardProfile,
  Incident,
  IncidentStatus,
  Inspection,
  InspectionTemplate,
  Permit,
  PpeItem,
  Project,
  ReviewerDecision,
  RiskLevel,
  SiteLocation,
  User,
  UserRole,
} from "@/lib/types";

/**
 * In-memory data layer standing in for the Postgres backend planned for Sprint 1.
 * Cached on `globalThis` so dev-mode module reloads don't reseed it.
 */

const globalForStore = globalThis as unknown as { __smartsafeStoreV2?: Store };

export const store: Store = globalForStore.__smartsafeStoreV2 ?? buildSeed(new Date());

if (!globalForStore.__smartsafeStoreV2) {
  globalForStore.__smartsafeStoreV2 = store;
}

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const newestFirst = <T extends { [k: string]: unknown }>(items: T[], key: keyof T) =>
  [...items].sort((a, b) => String(b[key]).localeCompare(String(a[key])));

/**
 * Every list query below is scoped to a companyId so one tenant never sees another
 * tenant's data. Projects and users carry companyId directly; everything else
 * (inspections, findings, corrective actions, permits, GC notices, assets) keys
 * off projectId, and certifications key off userId, so we resolve through those.
 */
function projectIdsForCompany(companyId: string): Set<string> {
  return new Set(store.projects.filter((p) => p.companyId === companyId).map((p) => p.id));
}

function userIdsForCompany(companyId: string): Set<string> {
  return new Set(store.users.filter((u) => u.companyId === companyId).map((u) => u.id));
}

// --- Users / Companies ---

export function getUser(id: string): User | undefined {
  return store.users.find((u) => u.id === id);
}

export function getCompany(id: string): Company | undefined {
  return store.companies.find((c) => c.id === id);
}

export function listCompanies(): Company[] {
  return store.companies;
}

export function updateCompanyBranding(
  id: string,
  input: { name?: string; primaryColor?: string; heroImage?: string }
): Company | undefined {
  const company = getCompany(id);
  if (!company) return undefined;
  if (input.name?.trim()) company.name = input.name.trim();
  if (input.primaryColor) company.primaryColor = input.primaryColor;
  if (input.heroImage) company.heroImage = input.heroImage;
  return company;
}

export function addHazardCategory(companyId: string, name: string): Company | undefined {
  const company = getCompany(companyId);
  if (!company) return undefined;
  const trimmed = name.trim();
  if (trimmed && !company.hazardCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    company.hazardCategories.push(trimmed);
  }
  return company;
}

export function removeHazardCategory(companyId: string, name: string): boolean {
  const company = getCompany(companyId);
  if (!company) return false;
  const inUse = store.templates.some(
    (t) => t.companyId === companyId && t.checklist.some((c) => c.hazard.category === name)
  );
  if (inUse) return false;
  company.hazardCategories = company.hazardCategories.filter((c) => c !== name);
  return true;
}

export function listUsers(companyId: string): User[] {
  return store.users.filter((u) => u.companyId === companyId);
}

export function findUserByEmail(email: string): User | undefined {
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(input: {
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  title: string;
}): User {
  const user: User = {
    id: nextId("u"),
    companyId: input.companyId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    role: input.role,
    title: input.title,
    active: true,
  };
  store.users.push(user);
  return user;
}

export function updateUser(
  id: string,
  input: { firstName?: string; lastName?: string; role?: UserRole; title?: string; active?: boolean }
): User | undefined {
  const user = getUser(id);
  if (!user) return undefined;
  if (input.firstName?.trim()) user.firstName = input.firstName.trim();
  if (input.lastName?.trim()) user.lastName = input.lastName.trim();
  if (input.role) user.role = input.role;
  if (input.title?.trim()) user.title = input.title.trim();
  if (input.active !== undefined) user.active = input.active;
  return user;
}

// --- Projects ---

export function listProjects(companyId: string): Project[] {
  return store.projects.filter((p) => p.companyId === companyId);
}

export function getProject(id: string): Project | undefined {
  return store.projects.find((p) => p.id === id);
}

export function createProject(input: {
  companyId: string;
  name: string;
  shortName: string;
  projectNumber: string;
  location: string;
  client: string;
  startDate: string;
  levels: string[];
  zones: string[];
  headcount: number;
}): Project {
  const project: Project = {
    id: nextId("p"),
    companyId: input.companyId,
    name: input.name,
    shortName: input.shortName,
    projectNumber: input.projectNumber,
    location: input.location,
    client: input.client,
    startDate: input.startDate,
    status: "active",
    percentComplete: 0,
    headcount: input.headcount,
    levels: input.levels,
    zones: input.zones,
    crewIds: [],
  };
  store.projects.push(project);
  return project;
}

export function updateProject(
  id: string,
  input: Partial<Pick<Project, "name" | "shortName" | "location" | "client" | "status" | "percentComplete" | "headcount">>
): Project | undefined {
  const project = getProject(id);
  if (!project) return undefined;
  Object.assign(project, input);
  return project;
}

export function addCrewMember(projectId: string, userId: string): Project | undefined {
  const project = getProject(projectId);
  if (!project) return undefined;
  if (!project.crewIds.includes(userId)) project.crewIds.push(userId);
  return project;
}

export function removeCrewMember(projectId: string, userId: string): Project | undefined {
  const project = getProject(projectId);
  if (!project) return undefined;
  project.crewIds = project.crewIds.filter((id) => id !== userId);
  return project;
}

// --- Templates ---

export function listTemplates(companyId: string): InspectionTemplate[] {
  return store.templates.filter((t) => t.companyId === companyId);
}

export function getTemplate(id: string): InspectionTemplate | undefined {
  return store.templates.find((t) => t.id === id);
}

export function createTemplate(input: {
  companyId: string;
  name: string;
  evidenceRequirement: EvidenceRequirement;
  aiAnalysisEnabled: boolean;
}): InspectionTemplate {
  const template: InspectionTemplate = {
    id: nextId("t"),
    companyId: input.companyId,
    name: input.name,
    evidenceRequirement: input.evidenceRequirement,
    aiAnalysisEnabled: input.aiAnalysisEnabled,
    checklist: [],
  };
  store.templates.push(template);
  return template;
}

export function updateTemplate(
  id: string,
  input: { name?: string; evidenceRequirement?: EvidenceRequirement; aiAnalysisEnabled?: boolean }
): InspectionTemplate | undefined {
  const template = getTemplate(id);
  if (!template) return undefined;
  if (input.name?.trim()) template.name = input.name.trim();
  if (input.evidenceRequirement) template.evidenceRequirement = input.evidenceRequirement;
  if (input.aiAnalysisEnabled !== undefined) template.aiAnalysisEnabled = input.aiAnalysisEnabled;
  return template;
}

/** Returns false without deleting if any inspection already references this template. */
export function deleteTemplate(id: string): boolean {
  const inUse = store.inspections.some((i) => i.templateId === id);
  if (inUse) return false;
  store.templates = store.templates.filter((t) => t.id !== id);
  return true;
}

export function addChecklistItem(
  templateId: string,
  input: { label: string; hazard: HazardProfile }
): ChecklistItem | undefined {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  const item: ChecklistItem = { id: nextId("c"), label: input.label, hazard: input.hazard };
  template.checklist.push(item);
  return item;
}

export function updateChecklistItem(
  templateId: string,
  itemId: string,
  input: { label: string; hazard: HazardProfile }
): ChecklistItem | undefined {
  const template = getTemplate(templateId);
  const item = template?.checklist.find((c) => c.id === itemId);
  if (!item) return undefined;
  item.label = input.label;
  item.hazard = input.hazard;
  return item;
}

/** Returns false without removing if any inspection response already references this item. */
export function removeChecklistItem(templateId: string, itemId: string): boolean {
  const inUse = store.inspections.some(
    (i) => i.templateId === templateId && i.responses.some((r) => r.itemId === itemId)
  );
  if (inUse) return false;
  const template = getTemplate(templateId);
  if (!template) return false;
  template.checklist = template.checklist.filter((c) => c.id !== itemId);
  return true;
}

// --- Inspections ---

export function listInspections(companyId: string): Inspection[] {
  const ids = projectIdsForCompany(companyId);
  return newestFirst(store.inspections.filter((i) => ids.has(i.projectId)), "submittedAt");
}

export function listInspectionsForProject(projectId: string): Inspection[] {
  return newestFirst(store.inspections.filter((i) => i.projectId === projectId), "submittedAt");
}

export function getInspection(id: string): Inspection | undefined {
  return store.inspections.find((i) => i.id === id);
}

export function createInspection(input: {
  projectId: string;
  templateId: string;
  inspectorId: string;
  location: SiteLocation;
  responses: ChecklistResponse[];
  evidence: Evidence[];
}): Inspection {
  const now = new Date();
  const inspection: Inspection = {
    id: nextId("i"),
    projectId: input.projectId,
    templateId: input.templateId,
    inspectorId: input.inspectorId,
    location: input.location,
    date: now.toISOString().slice(0, 10),
    submittedAt: now.toISOString(),
    status: "submitted",
    responses: input.responses,
    evidence: input.evidence,
    findingIds: [],
  };
  store.inspections.push(inspection);
  return inspection;
}

export function addFindingToInspection(inspectionId: string, finding: Finding) {
  const inspection = getInspection(inspectionId);
  if (!inspection) return;
  store.findings.push(finding);
  inspection.findingIds.push(finding.id);
}

export function markInspectionReviewed(inspectionId: string) {
  const inspection = getInspection(inspectionId);
  if (!inspection) return;
  inspection.status = "reviewed";
}

// --- Findings ---

export function listFindings(companyId: string): Finding[] {
  const ids = projectIdsForCompany(companyId);
  return newestFirst(store.findings.filter((f) => ids.has(f.projectId)), "createdAt");
}

export function getFinding(id: string): Finding | undefined {
  return store.findings.find((f) => f.id === id);
}

export function listFindingsForInspection(inspectionId: string): Finding[] {
  return store.findings.filter((f) => f.inspectionId === inspectionId);
}

export function reviewFinding(
  findingId: string,
  input: {
    decision: ReviewerDecision;
    reviewerId: string;
    overrideReason?: string;
    riskLevel?: RiskLevel;
  }
): Finding | undefined {
  const finding = getFinding(findingId);
  if (!finding) return undefined;
  finding.reviewerDecision = input.decision;
  finding.reviewerId = input.reviewerId;
  finding.reviewedAt = new Date().toISOString();
  finding.overrideReason = input.overrideReason;
  if (input.riskLevel) finding.riskLevel = input.riskLevel;

  const allReviewed = listFindingsForInspection(finding.inspectionId).every(
    (f) => f.reviewerDecision !== "pending"
  );
  if (allReviewed) {
    markInspectionReviewed(finding.inspectionId);
  }

  return finding;
}

export function attachCorrectiveActionToFinding(findingId: string, correctiveActionId: string) {
  const finding = getFinding(findingId);
  if (!finding) return;
  finding.correctiveActionId = correctiveActionId;
}

// --- Corrective Actions ---

export function listCorrectiveActions(companyId: string): CorrectiveAction[] {
  const ids = projectIdsForCompany(companyId);
  return newestFirst(store.correctiveActions.filter((c) => ids.has(c.projectId)), "createdAt");
}

export function listCorrectiveActionsForProject(projectId: string): CorrectiveAction[] {
  return newestFirst(store.correctiveActions.filter((c) => c.projectId === projectId), "createdAt");
}

export function getCorrectiveAction(id: string): CorrectiveAction | undefined {
  return store.correctiveActions.find((c) => c.id === id);
}

export function createCorrectiveAction(input: {
  projectId: string;
  source: CorrectiveAction["source"];
  findingId?: string;
  category: CorrectiveAction["category"];
  priority: RiskLevel;
  location?: SiteLocation;
  description: string;
  assignedToId: string;
  dueDate: string;
}): CorrectiveAction {
  const action: CorrectiveAction = {
    id: nextId("ca"),
    projectId: input.projectId,
    source: input.source,
    findingId: input.findingId,
    category: input.category,
    priority: input.priority,
    location: input.location,
    description: input.description,
    assignedToId: input.assignedToId,
    dueDate: input.dueDate,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  store.correctiveActions.push(action);
  if (input.findingId) {
    attachCorrectiveActionToFinding(input.findingId, action.id);
  }
  return action;
}

export function updateCorrectiveActionStatus(
  id: string,
  status: CorrectiveActionStatus
): CorrectiveAction | undefined {
  const action = getCorrectiveAction(id);
  if (!action) return undefined;
  action.status = status;
  const now = new Date().toISOString();
  if (status === "completed") action.completedAt = now;
  if (status === "verified") action.verifiedAt = now;
  if (status === "closed") action.closedAt = now;
  return action;
}

// --- Compliance ---

export function listCertifications(companyId: string): Certification[] {
  const ids = userIdsForCompany(companyId);
  return store.certifications.filter((c) => ids.has(c.userId));
}

export function listPermits(companyId: string): Permit[] {
  const ids = projectIdsForCompany(companyId);
  return newestFirst(store.permits.filter((p) => ids.has(p.projectId)), "startsAt");
}

export function listPpeItems(companyId: string): PpeItem[] {
  return store.ppeItems.filter((i) => i.companyId === companyId);
}

export function listAssets(companyId: string): Asset[] {
  const ids = projectIdsForCompany(companyId);
  return store.assets.filter((a) => ids.has(a.projectId));
}

export function listGcNotices(companyId: string): GcNotice[] {
  const ids = projectIdsForCompany(companyId);
  return newestFirst(store.gcNotices.filter((g) => ids.has(g.projectId)), "raisedAt");
}

export function createCertification(input: Omit<Certification, "id">): Certification {
  const cert: Certification = { id: nextId("crt"), ...input };
  store.certifications.push(cert);
  return cert;
}

export function createPermit(input: Omit<Permit, "id">): Permit {
  const permit: Permit = { id: nextId("prm"), ...input };
  store.permits.push(permit);
  return permit;
}

export function createPpeItem(input: Omit<PpeItem, "id">): PpeItem {
  const item: PpeItem = { id: nextId("ppe"), ...input };
  store.ppeItems.push(item);
  return item;
}

export function createAsset(input: Omit<Asset, "id">): Asset {
  const asset: Asset = { id: nextId("ast"), ...input };
  store.assets.push(asset);
  return asset;
}

export function createGcNotice(input: Omit<GcNotice, "id" | "raisedAt">): GcNotice {
  const notice: GcNotice = { id: nextId("gcn"), raisedAt: new Date().toISOString(), ...input };
  store.gcNotices.push(notice);
  return notice;
}

// --- Incidents ---

export function listIncidents(companyId: string): Incident[] {
  const ids = projectIdsForCompany(companyId);
  return newestFirst(store.incidents.filter((i) => ids.has(i.projectId)), "reportedAt");
}

export function getIncident(id: string): Incident | undefined {
  return store.incidents.find((i) => i.id === id);
}

export function createIncident(input: {
  projectId: string;
  type: Incident["type"];
  description: string;
  location: SiteLocation;
  involvedUserIds: string[];
  immediateAction: string;
  oshaRecordable: boolean;
  lostTimeDays: number;
  reportedById: string;
}): Incident {
  const incident: Incident = {
    id: nextId("inc"),
    projectId: input.projectId,
    type: input.type,
    description: input.description,
    location: input.location,
    involvedUserIds: input.involvedUserIds,
    immediateAction: input.immediateAction,
    oshaRecordable: input.oshaRecordable,
    lostTimeDays: input.lostTimeDays,
    status: "open",
    reportedById: input.reportedById,
    reportedAt: new Date().toISOString(),
  };
  store.incidents.push(incident);
  return incident;
}

export function updateIncidentStatus(id: string, status: IncidentStatus): Incident | undefined {
  const incident = getIncident(id);
  if (!incident) return undefined;
  incident.status = status;
  if (status === "closed") incident.closedAt = new Date().toISOString();
  return incident;
}
