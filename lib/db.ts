import "server-only";
import { buildSeed, type Store } from "@/lib/seed";
import type {
  Asset,
  Certification,
  ChecklistResponse,
  Company,
  CorrectiveAction,
  CorrectiveActionStatus,
  Evidence,
  Finding,
  GcNotice,
  Inspection,
  InspectionTemplate,
  Permit,
  PpeItem,
  Project,
  ReviewerDecision,
  RiskLevel,
  SiteLocation,
  User,
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

// --- Users / Companies ---

export function getUser(id: string): User | undefined {
  return store.users.find((u) => u.id === id);
}

export function getCompany(id: string): Company | undefined {
  return store.companies.find((c) => c.id === id);
}

export function listUsers(): User[] {
  return store.users;
}

export function findUserByEmail(email: string): User | undefined {
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// --- Projects ---

export function listProjects(): Project[] {
  return store.projects;
}

export function getProject(id: string): Project | undefined {
  return store.projects.find((p) => p.id === id);
}

// --- Templates ---

export function listTemplates(): InspectionTemplate[] {
  return store.templates;
}

export function getTemplate(id: string): InspectionTemplate | undefined {
  return store.templates.find((t) => t.id === id);
}

// --- Inspections ---

export function listInspections(): Inspection[] {
  return newestFirst(store.inspections, "submittedAt");
}

export function listInspectionsForProject(projectId: string): Inspection[] {
  return listInspections().filter((i) => i.projectId === projectId);
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

export function listFindings(): Finding[] {
  return newestFirst(store.findings, "createdAt");
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

export function listCorrectiveActions(): CorrectiveAction[] {
  return newestFirst(store.correctiveActions, "createdAt");
}

export function listCorrectiveActionsForProject(projectId: string): CorrectiveAction[] {
  return listCorrectiveActions().filter((c) => c.projectId === projectId);
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

export function listCertifications(): Certification[] {
  return store.certifications;
}

export function listPermits(): Permit[] {
  return newestFirst(store.permits, "startsAt");
}

export function listPpeItems(): PpeItem[] {
  return store.ppeItems;
}

export function listAssets(): Asset[] {
  return store.assets;
}

export function listGcNotices(): GcNotice[] {
  return newestFirst(store.gcNotices, "raisedAt");
}
