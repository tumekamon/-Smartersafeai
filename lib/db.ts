import "server-only";
import type {
  ChecklistResponse,
  Company,
  CorrectiveAction,
  CorrectiveActionStatus,
  Evidence,
  Finding,
  Inspection,
  InspectionTemplate,
  Project,
  ReviewerDecision,
  User,
} from "@/lib/types";

/**
 * In-memory store standing in for the Postgres backend planned for Sprint 1.
 * Cached on `globalThis` so it survives Next.js dev-mode module reloads —
 * without this, editing any file that imports the store would reseed it.
 * State still resets on server restart; this is a prototype data layer, not persistence.
 */

type Store = {
  companies: Company[];
  users: User[];
  projects: Project[];
  templates: InspectionTemplate[];
  inspections: Inspection[];
  findings: Finding[];
  correctiveActions: CorrectiveAction[];
};

function seed(): Store {
  const companies: Company[] = [
    { id: "co_besco", name: "BESCO Electric" },
  ];

  const users: User[] = [
    {
      id: "u_lawrence",
      companyId: "co_besco",
      firstName: "Lawrence",
      lastName: "Kibet",
      email: "lawrence@besco.example",
      role: "SAFETY_DIRECTOR",
      active: true,
    },
    {
      id: "u_amon",
      companyId: "co_besco",
      firstName: "Amon",
      lastName: "Tumek",
      email: "amon@besco.example",
      role: "SAFETY_MANAGER",
      active: true,
    },
    {
      id: "u_patrick",
      companyId: "co_besco",
      firstName: "Patrick",
      lastName: "Murani",
      email: "patrick@besco.example",
      role: "ADMIN",
      active: true,
    },
    {
      id: "u_justus",
      companyId: "co_besco",
      firstName: "Justus",
      lastName: "Gitau",
      email: "justus@besco.example",
      role: "SUPERVISOR",
      active: true,
    },
    {
      id: "u_worker1",
      companyId: "co_besco",
      firstName: "Kevin",
      lastName: "Otieno",
      email: "kevin@besco.example",
      role: "WORKER",
      active: true,
    },
  ];

  const projects: Project[] = [
    {
      id: "p_markey",
      companyId: "co_besco",
      name: "UK Markey Cancer Center & Advanced Ambulatory Complex",
      projectNumber: "BE-2026-014",
      location: "Lexington, KY",
      client: "Walsh Construction (GC)",
      startDate: "2026-02-10",
      status: "active",
      riskScore: 62,
    },
    {
      id: "p_lex_medical",
      companyId: "co_besco",
      name: "Lexington Medical Office Building",
      projectNumber: "BE-2026-021",
      location: "Lexington, KY",
      client: "Turner Construction (GC)",
      startDate: "2026-05-01",
      status: "active",
      riskScore: 34,
    },
  ];

  const templates: InspectionTemplate[] = [
    {
      id: "t_daily",
      name: "Daily Site Inspection",
      evidenceRequirement: "optional",
      aiAnalysisEnabled: true,
      checklist: [
        { id: "c1", label: "Housekeeping and material storage" },
        { id: "c2", label: "Egress paths clear and marked" },
        { id: "c3", label: "Temporary lighting operational" },
        { id: "c4", label: "PPE worn correctly by all personnel" },
        { id: "c5", label: "Fire extinguishers accessible and charged" },
      ],
    },
    {
      id: "t_electrical",
      name: "Electrical Safety Inspection",
      evidenceRequirement: "required",
      aiAnalysisEnabled: true,
      checklist: [
        { id: "c1", label: "GFCI protection on all temporary circuits" },
        { id: "c2", label: "Extension cords free of damage" },
        { id: "c3", label: "Energized equipment properly labeled" },
        { id: "c4", label: "LOTO procedures followed" },
        { id: "c5", label: "Panels and rooms clear of obstruction" },
      ],
    },
    {
      id: "t_scissor_lift",
      name: "Scissor Lift Pre-Use Inspection",
      evidenceRequirement: "disabled",
      aiAnalysisEnabled: false,
      checklist: [
        { id: "c1", label: "Tires and wheels" },
        { id: "c2", label: "Controls" },
        { id: "c3", label: "Emergency stop" },
        { id: "c4", label: "Platform and guardrails" },
        { id: "c5", label: "Hydraulics" },
        { id: "c6", label: "Horn and lights" },
      ],
    },
    {
      id: "t_ppe",
      name: "PPE Compliance Inspection",
      evidenceRequirement: "required",
      aiAnalysisEnabled: true,
      checklist: [
        { id: "c1", label: "Hard hats worn" },
        { id: "c2", label: "High-visibility vests worn" },
        { id: "c3", label: "Eye protection worn where required" },
        { id: "c4", label: "Fall protection worn at height" },
      ],
    },
  ];

  const inspections: Inspection[] = [
    {
      id: "i_001",
      projectId: "p_markey",
      templateId: "t_electrical",
      inspectorId: "u_justus",
      date: "2026-09-10",
      status: "reviewed",
      responses: [
        { itemId: "c1", value: "fail", note: "Panel B3 missing GFCI" },
        { itemId: "c2", value: "pass" },
        { itemId: "c3", value: "pass" },
        { itemId: "c4", value: "pass" },
        { itemId: "c5", value: "pass" },
      ],
      evidence: [],
      findingIds: ["f_001"],
    },
  ];

  const findings: Finding[] = [
    {
      id: "f_001",
      inspectionId: "i_001",
      hazardCategory: "Unsafe electrical conditions",
      aiConfidence: 0.87,
      riskLevel: "high",
      aiExplanation:
        "Detected an unprotected temporary circuit near a wet-location panel with no visible GFCI device.",
      regulatoryReference: "OSHA 1926.404(b)(1)(i)",
      reviewerDecision: "approved",
      reviewerId: "u_amon",
      correctiveActionId: "ca_001",
      createdAt: "2026-09-10T14:20:00Z",
    },
  ];

  const correctiveActions: CorrectiveAction[] = [
    {
      id: "ca_001",
      projectId: "p_markey",
      source: "finding",
      findingId: "f_001",
      description: "Install GFCI protection on Panel B3 temporary circuit.",
      assignedToId: "u_justus",
      dueDate: "2026-09-13",
      status: "open",
      createdAt: "2026-09-10T14:25:00Z",
    },
  ];

  return { companies, users, projects, templates, inspections, findings, correctiveActions };
}

const globalForStore = globalThis as unknown as { __smartsafeStore?: Store };

export const store = globalForStore.__smartsafeStore ?? seed();

if (!globalForStore.__smartsafeStore) {
  globalForStore.__smartsafeStore = store;
}

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

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
  return store.inspections;
}

export function listInspectionsForProject(projectId: string): Inspection[] {
  return store.inspections.filter((i) => i.projectId === projectId);
}

export function getInspection(id: string): Inspection | undefined {
  return store.inspections.find((i) => i.id === id);
}

export function createInspection(input: {
  projectId: string;
  templateId: string;
  inspectorId: string;
  responses: ChecklistResponse[];
  evidence: Evidence[];
}): Inspection {
  const inspection: Inspection = {
    id: nextId("i"),
    projectId: input.projectId,
    templateId: input.templateId,
    inspectorId: input.inspectorId,
    date: new Date().toISOString().slice(0, 10),
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
  return store.findings;
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
  }
): Finding | undefined {
  const finding = getFinding(findingId);
  if (!finding) return undefined;
  finding.reviewerDecision = input.decision;
  finding.reviewerId = input.reviewerId;
  finding.overrideReason = input.overrideReason;

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
  return store.correctiveActions;
}

export function listCorrectiveActionsForProject(projectId: string): CorrectiveAction[] {
  return store.correctiveActions.filter((c) => c.projectId === projectId);
}

export function getCorrectiveAction(id: string): CorrectiveAction | undefined {
  return store.correctiveActions.find((c) => c.id === id);
}

export function createCorrectiveAction(input: {
  projectId: string;
  source: CorrectiveAction["source"];
  findingId?: string;
  description: string;
  assignedToId: string;
  dueDate: string;
}): CorrectiveAction {
  const action: CorrectiveAction = {
    id: nextId("ca"),
    projectId: input.projectId,
    source: input.source,
    findingId: input.findingId,
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
