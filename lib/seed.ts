import "server-only";
import type {
  Asset,
  Certification,
  CertificationType,
  ChecklistResponse,
  Company,
  CorrectiveAction,
  CorrectiveActionStatus,
  Evidence,
  Finding,
  GcNotice,
  HazardProfile,
  Incident,
  Inspection,
  InspectionTemplate,
  Permit,
  PermitType,
  PpeItem,
  Project,
  ReviewerDecision,
  RiskLevel,
  SiteLocation,
  User,
} from "@/lib/types";

export type Store = {
  companies: Company[];
  users: User[];
  projects: Project[];
  templates: InspectionTemplate[];
  inspections: Inspection[];
  findings: Finding[];
  correctiveActions: CorrectiveAction[];
  certifications: Certification[];
  permits: Permit[];
  ppeItems: PpeItem[];
  assets: Asset[];
  gcNotices: GcNotice[];
  incidents: Incident[];
};

const DAY = 86_400_000;
const HOUR = 3_600_000;

function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hazard = (h: HazardProfile) => h;

const TEMPLATES: InspectionTemplate[] = [
  {
    id: "t_daily",
    companyId: "co_besco",
    name: "Daily Site Inspection",
    evidenceRequirement: "optional",
    aiAnalysisEnabled: true,
    checklist: [
      {
        id: "c1",
        label: "Housekeeping and material storage",
        hazard: hazard({
          category: "Housekeeping",
          title: "Material stored in walkway",
          regulatoryReference: "OSHA 1926.25(a)",
          risk: "low",
          scene: "egress",
          narrative:
            "Stacked material detected on the working surface, reducing the clear walking width and creating a trip hazard.",
          remedy: "Clear and re-stack materials; assign a daily housekeeping owner",
        }),
      },
      {
        id: "c2",
        label: "Egress paths clear and marked",
        hazard: hazard({
          category: "Egress",
          title: "Blocked egress path",
          regulatoryReference: "OSHA 1926.34(a)",
          risk: "high",
          scene: "egress",
          narrative:
            "Pallets and stacked material detected in the marked exit route. Clear width appears below the required minimum.",
          remedy: "Clear the egress path and re-mark the exit route",
        }),
      },
      {
        id: "c3",
        label: "Temporary lighting operational",
        hazard: hazard({
          category: "Electrical",
          title: "Damaged temporary lighting",
          regulatoryReference: "OSHA 1926.56(a)",
          risk: "medium",
          scene: "cord",
          narrative:
            "Temporary lighting string with a broken lamp guard and dangling wiring detected above a walking route.",
          remedy: "Repair or replace the temporary lighting string",
        }),
      },
      {
        id: "c4",
        label: "PPE worn correctly by all personnel",
        hazard: hazard({
          category: "PPE",
          title: "Missing high-visibility vest",
          regulatoryReference: "OSHA 1926.95(a)",
          risk: "medium",
          scene: "vest",
          narrative:
            "Person detected in an active work zone without a high-visibility vest. Hard hat present.",
          remedy: "Issue hi-vis vests and brief the crew at the next toolbox talk",
        }),
      },
      {
        id: "c5",
        label: "Fire extinguishers accessible and charged",
        hazard: hazard({
          category: "Fire Protection",
          title: "Obstructed fire extinguisher",
          regulatoryReference: "OSHA 1926.150(a)(5)",
          risk: "medium",
          scene: "egress",
          narrative:
            "Extinguisher station partially blocked by staged material. Gauge could not be confirmed in view.",
          remedy: "Relocate obstructing material and verify extinguisher charge",
        }),
      },
    ],
  },
  {
    id: "t_electrical",
    companyId: "co_besco",
    name: "Electrical Safety Inspection",
    evidenceRequirement: "required",
    aiAnalysisEnabled: true,
    checklist: [
      {
        id: "c1",
        label: "GFCI protection on all temporary circuits",
        hazard: hazard({
          category: "Electrical",
          title: "Missing GFCI protection",
          regulatoryReference: "OSHA 1926.404(b)(1)(ii)",
          risk: "high",
          scene: "panel",
          narrative:
            "Open receptacle with no GFCI device detected on a temporary circuit. Standing water is visible within reach of the panel.",
          remedy: "Install GFCI protection on the temporary circuit",
        }),
      },
      {
        id: "c2",
        label: "Extension cords free of damage",
        hazard: hazard({
          category: "Electrical",
          title: "Damaged extension cord",
          regulatoryReference: "OSHA 1926.405(a)(2)(ii)(J)",
          risk: "high",
          scene: "cord",
          narrative:
            "Cord jacket damage detected along a walking surface with tape covering exposed conductor.",
          remedy: "Remove from service and replace the damaged cord",
        }),
      },
      {
        id: "c3",
        label: "Energized equipment properly labeled",
        hazard: hazard({
          category: "Electrical",
          title: "Unlabeled energized equipment",
          regulatoryReference: "OSHA 1926.403(g)",
          risk: "high",
          scene: "panel",
          narrative:
            "Energized enclosure detected without a visible voltage or arc-flash label.",
          remedy: "Label energized equipment per NFPA 70E",
        }),
      },
      {
        id: "c4",
        label: "LOTO procedures followed",
        hazard: hazard({
          category: "Electrical",
          title: "Lockout/tagout not applied",
          regulatoryReference: "OSHA 1926.417(a)",
          risk: "critical",
          scene: "panel",
          narrative:
            "Work in progress on a panel with no lock or tag visible on the disconnect.",
          remedy: "Re-apply LOTO and retrain the crew on the procedure",
        }),
      },
      {
        id: "c5",
        label: "Panels and rooms clear of obstruction",
        hazard: hazard({
          category: "Electrical",
          title: "Panel clearance obstructed",
          regulatoryReference: "OSHA 1926.403(i)(1)",
          risk: "medium",
          scene: "panel",
          narrative:
            "Material staged within the 36-inch working space in front of an electrical panel.",
          remedy: "Clear the 36-inch working space in front of the panel",
        }),
      },
    ],
  },
  {
    id: "t_scissor_lift",
    companyId: "co_besco",
    name: "Scissor Lift Pre-Use Inspection",
    evidenceRequirement: "disabled",
    aiAnalysisEnabled: false,
    checklist: [
      { id: "c1", label: "Tires and wheels", hazard: hazard({ category: "Equipment", title: "Tire or wheel defect", regulatoryReference: "OSHA 1926.453(b)(2)", risk: "medium", scene: "lift", narrative: "", remedy: "Tag out the lift until tires are repaired" }) },
      { id: "c2", label: "Controls", hazard: hazard({ category: "Equipment", title: "Control fault", regulatoryReference: "OSHA 1926.453(b)(2)", risk: "high", scene: "lift", narrative: "", remedy: "Tag out the lift until controls are serviced" }) },
      { id: "c3", label: "Emergency stop", hazard: hazard({ category: "Equipment", title: "Emergency stop not functioning", regulatoryReference: "OSHA 1926.453(b)(2)", risk: "critical", scene: "lift", narrative: "", remedy: "Tag out the lift until the emergency stop is repaired" }) },
      { id: "c4", label: "Platform and guardrails", hazard: hazard({ category: "Equipment", title: "Guardrail defect", regulatoryReference: "OSHA 1926.451(g)", risk: "high", scene: "lift", narrative: "", remedy: "Tag out the lift until guardrails are restored" }) },
      { id: "c5", label: "Hydraulics", hazard: hazard({ category: "Equipment", title: "Hydraulic leak", regulatoryReference: "OSHA 1926.453(b)(2)", risk: "high", scene: "lift", narrative: "", remedy: "Tag out the lift until the leak is repaired" }) },
      { id: "c6", label: "Horn and lights", hazard: hazard({ category: "Equipment", title: "Horn or lights inoperable", regulatoryReference: "OSHA 1926.453(b)(2)", risk: "low", scene: "lift", narrative: "", remedy: "Repair horn and lights before next use" }) },
    ],
  },
  {
    id: "t_ppe",
    companyId: "co_besco",
    name: "PPE Compliance Inspection",
    evidenceRequirement: "required",
    aiAnalysisEnabled: true,
    checklist: [
      {
        id: "c1",
        label: "Hard hats worn",
        hazard: hazard({
          category: "PPE",
          title: "Missing hard hat",
          regulatoryReference: "OSHA 1926.100(a)",
          risk: "medium",
          scene: "vest",
          narrative:
            "Person detected in an overhead-hazard zone without a hard hat.",
          remedy: "Enforce the hard hat requirement with a crew toolbox talk",
        }),
      },
      {
        id: "c2",
        label: "High-visibility vests worn",
        hazard: hazard({
          category: "PPE",
          title: "Missing high-visibility vest",
          regulatoryReference: "OSHA 1926.95(a)",
          risk: "medium",
          scene: "vest",
          narrative:
            "Person detected working near equipment traffic without a high-visibility vest.",
          remedy: "Issue hi-vis vests and brief the crew",
        }),
      },
      {
        id: "c3",
        label: "Eye protection worn where required",
        hazard: hazard({
          category: "PPE",
          title: "Missing eye protection",
          regulatoryReference: "OSHA 1926.102(a)(1)",
          risk: "medium",
          scene: "vest",
          narrative:
            "Person detected drilling overhead without eye protection.",
          remedy: "Issue safety glasses and post eye protection signage",
        }),
      },
      {
        id: "c4",
        label: "Fall protection worn at height",
        hazard: hazard({
          category: "Fall Protection",
          title: "Fall protection not worn at height",
          regulatoryReference: "OSHA 1926.501(b)(1)",
          risk: "critical",
          scene: "ladder",
          narrative:
            "Worker detected above six feet with no harness or tie-off visible.",
          remedy: "Run a tie-off audit and retrain the crew on fall protection",
        }),
      },
    ],
  },
];

const FAIL_NOTES = [
  "Reported by foreman during walkdown",
  "Found during pre-shift walk",
  "Raised by crew member",
  "Spotted while escorting the GC walkthrough",
  "Repeat observation from last week",
  "Corrected on the spot, logged for tracking",
];

const CERT_TYPES: { type: CertificationType; months: number }[] = [
  { type: "Electrical Safety (NFPA 70E)", months: 36 },
  { type: "LOTO Authorized", months: 12 },
  { type: "HAZCOM", months: 12 },
  { type: "First Aid / CPR", months: 24 },
  { type: "Fall Protection", months: 36 },
  { type: "Aerial Lift Operator", months: 36 },
];

export function buildSeed(now: Date): Store {
  const rand = makeRng(20260907);
  const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];
  const chance = (p: number) => rand() < p;
  const between = (min: number, max: number) => min + rand() * (max - min);

  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now.getTime() - daysAgo * DAY);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const iso = (d: Date) => d.toISOString();
  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
  const clampNow = (d: Date) => (d.getTime() > now.getTime() ? new Date(now.getTime() - 60_000) : d);

  const companies: Company[] = [
    {
      id: "co_besco",
      name: "BESCO Electric",
      primaryColor: "#2f6df6",
      heroImage: "/bg-hero.jpg",
      hazardCategories: ["Electrical", "PPE", "Fall Protection", "Housekeeping", "Egress", "Fire Protection", "Equipment"],
    },
  ];

  const mk = (
    id: string,
    first: string,
    last: string,
    role: User["role"],
    title: string,
    email?: string,
    featured = false
  ): User => ({
    id,
    companyId: "co_besco",
    firstName: first,
    lastName: last,
    email: email ?? `${first}.${last}@besco.example`.toLowerCase(),
    role,
    title,
    active: true,
    featured,
  });

  const users: User[] = [
    mk("u_patrick", "Patrick", "Murani", "ADMIN", "Platform Administrator", "patrick@besco.example", true),
    mk("u_lawrence", "Lawrence", "Kibet", "SAFETY_DIRECTOR", "EHS Director", "lawrence@besco.example", true),
    mk("u_amon", "Amon", "Tumek", "SAFETY_MANAGER", "Site Safety Manager", "amon@besco.example", true),
    mk("u_justus", "Justus", "Gitau", "SUPERVISOR", "Electrical Superintendent", "justus@besco.example", true),
    mk("u_kevin", "Kevin", "Otieno", "WORKER", "Journeyman Electrician", "kevin@besco.example", true),
    {
      id: "u_dana",
      companyId: "co_besco",
      firstName: "Dana",
      lastName: "Whitfield",
      email: "dana@walsh.example",
      role: "CLIENT_VIEWER",
      title: "Project Executive, Walsh Construction",
      active: true,
      featured: true,
    },
    mk("u_marcus", "Marcus", "Reed", "SUPERVISOR", "Electrical Foreman"),
    mk("u_tanya", "Tanya", "Brooks", "SUPERVISOR", "Electrical Foreman"),
    mk("u_luis", "Luis", "Ortega", "SUPERVISOR", "General Foreman"),
    mk("u_brian", "Brian", "Kamau", "WORKER", "Journeyman Electrician"),
    mk("u_sofia", "Sofia", "Alvarez", "WORKER", "Journeyman Electrician"),
    mk("u_devon", "Devon", "Carter", "WORKER", "Apprentice Electrician"),
    mk("u_miguel", "Miguel", "Santos", "WORKER", "Journeyman Electrician"),
    mk("u_priya", "Priya", "Nair", "WORKER", "Low-Voltage Technician"),
    mk("u_tyler", "Tyler", "Boone", "WORKER", "Apprentice Electrician"),
    mk("u_grace", "Grace", "Wanjiru", "WORKER", "Journeyman Electrician"),
    mk("u_omar", "Omar", "Haddad", "WORKER", "Journeyman Electrician"),
    mk("u_jake", "Jake", "Miller", "WORKER", "Apprentice Electrician"),
    mk("u_rosa", "Rosa", "Delgado", "WORKER", "Journeyman Electrician"),
    mk("u_ethan", "Ethan", "Cole", "WORKER", "Lift Operator"),
  ];

  const projects: Project[] = [
    {
      id: "p_markey",
      companyId: "co_besco",
      name: "UK Markey Cancer Center & Advanced Ambulatory Complex",
      shortName: "Markey Cancer Center",
      projectNumber: "BE-2026-014",
      location: "Lexington, KY",
      client: "Walsh Construction",
      startDate: dateOnly(at(214, 8)),
      status: "active",
      percentComplete: 58,
      headcount: 34,
      levels: ["B1", "L1", "L2", "L3", "L4", "L5"],
      zones: ["North", "East", "South", "West"],
      crewIds: [],
    },
    {
      id: "p_lex_medical",
      companyId: "co_besco",
      name: "Lexington Medical Office Building",
      shortName: "Lexington MOB",
      projectNumber: "BE-2026-021",
      location: "Lexington, KY",
      client: "Ridgeline Construction Group",
      startDate: dateOnly(at(132, 8)),
      status: "active",
      percentComplete: 31,
      headcount: 18,
      levels: ["L1", "L2", "L3", "L4"],
      zones: ["North", "East", "South", "West"],
      crewIds: [],
    },
    {
      id: "p_louisville",
      companyId: "co_besco",
      name: "Louisville Surgical Pavilion",
      shortName: "Louisville Pavilion",
      projectNumber: "BE-2026-027",
      location: "Louisville, KY",
      client: "Halvorsen Builders",
      startDate: dateOnly(at(96, 8)),
      status: "active",
      percentComplete: 22,
      headcount: 14,
      levels: ["L1", "L2", "L3"],
      zones: ["North", "East", "South", "West"],
      crewIds: [],
    },
  ];

  const crews: Record<string, string[]> = {
    p_markey: ["u_justus", "u_marcus", "u_kevin", "u_brian", "u_sofia", "u_devon", "u_miguel", "u_priya"],
    p_lex_medical: ["u_luis", "u_omar", "u_jake", "u_rosa", "u_ethan", "u_tyler"],
    p_louisville: ["u_tanya", "u_grace", "u_jake", "u_ethan"],
  };
  for (const pr of projects) pr.crewIds = crews[pr.id];
  const foremen = new Set(["u_justus", "u_marcus", "u_luis", "u_tanya"]);
  const safetyStaff = ["u_amon", "u_amon", "u_lawrence"];
  const reviewers = ["u_amon", "u_amon", "u_amon", "u_lawrence"];

  const assets: Asset[] = [
    { id: "a_sl01", tag: "SL-01", name: "Scissor lift 19 ft", projectId: "p_markey" },
    { id: "a_sl02", tag: "SL-02", name: "Scissor lift 26 ft", projectId: "p_markey" },
    { id: "a_sl05", tag: "SL-05", name: "Scissor lift 32 ft", projectId: "p_markey" },
    { id: "a_sl03", tag: "SL-03", name: "Scissor lift 19 ft", projectId: "p_lex_medical" },
    { id: "a_sl04", tag: "SL-04", name: "Scissor lift 26 ft", projectId: "p_louisville" },
  ];

  const curve = [0.8, 0.9, 1.0, 1.15, 1.35, 1.55, 1.75, 1.4, 0.9, 0.7, 0.8, 1.15];
  const baseFail: Record<string, number> = {
    t_daily: 0.075,
    t_electrical: 0.085,
    t_ppe: 0.1,
    t_scissor_lift: 0.02,
  };
  const projectFail: Record<string, number> = { p_markey: 1.3, p_lex_medical: 1.0, p_louisville: 0.7 };
  const assetFailBoost: Record<string, number> = { "SL-03": 3.2, "SL-02": 1.6 };

  const boost = (projectId: string, loc: SiteLocation, category: string, week: number) => {
    let m = 1;
    if (projectId === "p_markey") {
      if (loc.level === "L3" && loc.zone === "East" && category === "Electrical") m *= week >= 9 ? 9 : 3.5;
      if (loc.level === "B1" && loc.zone === "South" && category === "Electrical") m *= 4;
      if (loc.level === "L5" && loc.zone === "West" && (category === "Fall Protection" || category === "PPE")) m *= 5;
      if (loc.level === "L2" && loc.zone === "North" && (category === "Housekeeping" || category === "Egress")) m *= 3.5;
    }
    if (projectId === "p_lex_medical" && loc.level === "L2" && category === "PPE") m *= 2;
    if (projectId === "p_louisville" && loc.level === "L1" && category === "Electrical") m *= 1.8;
    return m;
  };

  const isHotCell = (projectId: string, loc: SiteLocation) =>
    (projectId === "p_markey" &&
      ((loc.level === "L3" && loc.zone === "East") ||
        (loc.level === "B1" && loc.zone === "South") ||
        (loc.level === "L5" && loc.zone === "West") ||
        (loc.level === "L2" && loc.zone === "North"))) ||
    (projectId === "p_lex_medical" && loc.level === "L2") ||
    (projectId === "p_louisville" && loc.level === "L1");

  const pickLocation = (project: Project): SiteLocation => {
    const cells: SiteLocation[] = [];
    for (const level of project.levels) {
      for (const zone of project.zones) {
        const loc = { level, zone };
        const weight = isHotCell(project.id, loc) ? 5 : 1;
        for (let i = 0; i < weight; i++) cells.push(loc);
      }
    }
    return pick(cells);
  };

  const inspections: Inspection[] = [];
  const findings: Finding[] = [];
  const correctiveActions: CorrectiveAction[] = [];
  let inspSeq = 1;
  let findSeq = 1;
  let caSeq = 1;
  let imgSeq = 2031;

  const dueDays: Record<RiskLevel, number> = { critical: 1, high: 3, medium: 7, low: 14 };

  const buildAction = (opts: {
    projectId: string;
    source: CorrectiveAction["source"];
    findingId?: string;
    category: CorrectiveAction["category"];
    priority: RiskLevel;
    location?: SiteLocation;
    description: string;
    createdAt: Date;
  }) => {
    const crew = crews[opts.projectId];
    const heavy = opts.priority === "critical" || opts.priority === "high";
    const assignee = heavy
      ? pick(crew.filter((id) => foremen.has(id)))
      : pick(crew);
    const due = new Date(opts.createdAt.getTime() + dueDays[opts.priority] * DAY);
    const ageDays = (now.getTime() - opts.createdAt.getTime()) / DAY;
    const overdueWindow = ageDays - dueDays[opts.priority];

    let status: CorrectiveActionStatus;
    const r = rand();
    if (overdueWindow > 8) status = r < 0.82 ? "closed" : "verified";
    else if (overdueWindow > 6) status = r < 0.8 ? "closed" : r < 0.94 ? "verified" : "completed";
    else if (overdueWindow > 0) status = r < 0.5 ? "closed" : r < 0.74 ? "verified" : r < 0.88 ? "completed" : "open";
    else status = r < 0.16 ? "closed" : r < 0.3 ? "verified" : r < 0.5 ? "completed" : "open";

    const action: CorrectiveAction = {
      id: `ca_${String(caSeq++).padStart(4, "0")}`,
      projectId: opts.projectId,
      source: opts.source,
      findingId: opts.findingId,
      category: opts.category,
      priority: opts.priority,
      location: opts.location,
      description: opts.description,
      assignedToId: assignee,
      dueDate: dateOnly(due),
      status,
      createdAt: iso(opts.createdAt),
    };

    if (status !== "open") {
      const completed = new Date(opts.createdAt.getTime() + between(0.3, Math.max(0.5, dueDays[opts.priority] + 2)) * DAY);
      if (completed.getTime() >= now.getTime()) {
        action.status = "open";
      } else {
        action.completedAt = iso(completed);
        if (status === "verified" || status === "closed") {
          const verified = new Date(completed.getTime() + between(0.3, 2) * DAY);
          if (verified.getTime() >= now.getTime()) {
            action.status = "completed";
          } else {
            action.verifiedAt = iso(verified);
            if (status === "closed") {
              const closed = new Date(verified.getTime() + between(0.1, 1) * DAY);
              if (closed.getTime() >= now.getTime()) action.status = "verified";
              else action.closedAt = iso(closed);
            }
          }
        }
      }
    }
    correctiveActions.push(action);
    return action;
  };

  const weights: [string, number][] = [
    ["t_daily", 0.46],
    ["t_electrical", 0.3],
    ["t_ppe", 0.24],
  ];
  const pickTemplate = () => {
    let r = rand();
    for (const [id, w] of weights) {
      if (r < w) return TEMPLATES.find((t) => t.id === id)!;
      r -= w;
    }
    return TEMPLATES[0];
  };

  const perDay: Record<string, number> = { p_markey: 1.7, p_lex_medical: 1.0, p_louisville: 0.75 };

  for (let d = 83; d >= 0; d--) {
    const day = at(d, 12);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    const week = 11 - Math.floor(d / 7);

    for (const project of projects) {
      const target = perDay[project.id];
      let count = Math.floor(target) + (rand() < target - Math.floor(target) ? 1 : 0);
      if (project.id === "p_markey" && rand() < 0.25) count += 1;

      for (let n = 0; n < count; n++) {
        const location = pickLocation(project);
        const electricalHot =
          (project.id === "p_markey" && ((location.level === "L3" && location.zone === "East") || (location.level === "B1" && location.zone === "South"))) ||
          (project.id === "p_louisville" && location.level === "L1");
        const template = electricalHot && chance(0.7) ? TEMPLATES.find((tp) => tp.id === "t_electrical")! : pickTemplate();
        const submitted = clampNow(at(d, 6 + Math.floor(rand() * 9), Math.floor(rand() * 60)));

        const inspector =
          template.id === "t_scissor_lift"
            ? pick(crews[project.id])
            : template.id === "t_ppe"
              ? pick([...safetyStaff, ...crews[project.id].filter((id) => foremen.has(id))])
              : pick([...crews[project.id].filter((id) => foremen.has(id)), ...safetyStaff]);

        const inspection: Inspection = {
          id: `i_${String(inspSeq++).padStart(4, "0")}`,
          projectId: project.id,
          templateId: template.id,
          inspectorId: inspector,
          location,
          date: dateOnly(submitted),
          submittedAt: iso(submitted),
          status: "submitted",
          responses: [],
          evidence: [],
          findingIds: [],
        };

        if (template.id === "t_scissor_lift") {
          const projectAssets = assets.filter((a) => a.projectId === project.id);
          inspection.assetTag = pick(projectAssets).tag;
        }

        const responses: ChecklistResponse[] = [];
        const failed: typeof template.checklist = [];
        for (const item of template.checklist) {
          const p = Math.min(
            0.5,
            baseFail[template.id] * curve[week] * projectFail[project.id] * boost(project.id, location, item.hazard.category, week)
          );
          if (chance(p)) {
            responses.push({ itemId: item.id, value: "fail", note: pick(FAIL_NOTES) });
            failed.push(item);
          } else {
            responses.push({ itemId: item.id, value: chance(0.03) ? "na" : "pass" });
          }
        }
        inspection.responses = responses;

        const ageDays = d;

        if (!template.aiAnalysisEnabled) {
          inspection.status = "reviewed";
          for (const item of failed) {
            buildAction({
              projectId: project.id,
              source: "infraction",
              category: "Equipment",
              priority: item.hazard.risk,
              location,
              description: `${item.hazard.remedy} (${inspection.assetTag})`,
              createdAt: new Date(submitted.getTime() + 20 * 60_000),
            });
          }
        } else if (failed.length > 0) {
          const first = failed[0];
          const evidence: Evidence = {
            id: `ev_${imgSeq}`,
            fileName: `IMG_${imgSeq++}.jpg`,
            scene: first.hazard.scene,
            capturedAt: iso(submitted),
          };
          inspection.evidence = [evidence];

          let anyPending = false;
          for (const item of failed) {
            const conf = Math.min(0.98, 0.62 + rand() * 0.35);
            const created = new Date(submitted.getTime() + between(1, 4) * 60_000);
            const pendingBias = ageDays === 0 ? 0.92 : ageDays <= 2 ? 0.6 : 0;
            let decision: ReviewerDecision;
            if (chance(pendingBias)) decision = "pending";
            else {
              const r = rand();
              decision =
                item.hazard.risk === "critical"
                  ? r < 0.86 ? "approved" : r < 0.97 ? "overridden" : "rejected"
                  : r < 0.72 ? "approved" : r < 0.83 ? "overridden" : "rejected";
            }
            const finding: Finding = {
              id: `f_${String(findSeq++).padStart(4, "0")}`,
              inspectionId: inspection.id,
              projectId: project.id,
              location,
              hazardCategory: item.hazard.category,
              title: item.hazard.title,
              aiConfidence: conf,
              riskLevel: item.hazard.risk,
              aiExplanation: item.hazard.narrative,
              regulatoryReference: item.hazard.regulatoryReference,
              scene: item.hazard.scene,
              evidenceId: evidence.id,
              reviewerDecision: decision,
              createdAt: iso(created),
            };
            if (decision !== "pending") {
              const reviewed = clampNow(new Date(created.getTime() + between(2, 30) * HOUR));
              finding.reviewerId = pick(reviewers);
              finding.reviewedAt = iso(reviewed);
              if (decision === "overridden") {
                finding.overrideReason = pick([
                  "Condition corrected before review; severity reduced",
                  "Hazard is real but risk level lower than flagged",
                  "Different hazard than detected; reclassified by reviewer",
                ]);
                finding.riskLevel = finding.riskLevel === "critical" ? "high" : finding.riskLevel === "high" ? "medium" : "low";
              }
              if (decision !== "rejected") {
                const action = buildAction({
                  projectId: project.id,
                  source: "finding",
                  findingId: finding.id,
                  category: item.hazard.category,
                  priority: finding.riskLevel,
                  location,
                  description: `${item.hazard.remedy} — ${project.shortName}, ${location.level} ${location.zone}`,
                  createdAt: reviewed,
                });
                finding.correctiveActionId = action.id;
              }
            } else {
              anyPending = true;
            }
            findings.push(finding);
            inspection.findingIds.push(finding.id);
          }
          inspection.status = anyPending ? "submitted" : "reviewed";
        } else {
          inspection.status = "reviewed";
        }

        inspections.push(inspection);
      }
    }
  }

  const liftTemplate = TEMPLATES.find((tp) => tp.id === "t_scissor_lift")!;
  for (let d = 83; d >= 0; d--) {
    const day = at(d, 12);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const week = 11 - Math.floor(d / 7);
    for (const asset of assets) {
      if (!chance(0.72)) continue;
      const project = projects.find((pr) => pr.id === asset.projectId)!;
      const submitted = clampNow(at(d, 6, Math.floor(rand() * 40)));
      const responses: ChecklistResponse[] = [];
      const failedItems: typeof liftTemplate.checklist = [];
      for (const item of liftTemplate.checklist) {
        const p = Math.min(0.5, baseFail.t_scissor_lift * curve[week] * (assetFailBoost[asset.tag] ?? 1));
        if (chance(p)) {
          responses.push({ itemId: item.id, value: "fail", note: pick(["Found during pre-use check", "Reported by operator", "Tagged out pending repair"]) });
          failedItems.push(item);
        } else responses.push({ itemId: item.id, value: "pass" });
      }
      const location = pickLocation(project);
      const operator = pick(crews[project.id].filter((id) => !foremen.has(id)));
      const inspection: Inspection = {
        id: `i_${String(inspSeq++).padStart(4, "0")}`,
        projectId: project.id,
        templateId: liftTemplate.id,
        inspectorId: operator,
        location,
        date: dateOnly(submitted),
        submittedAt: iso(submitted),
        status: "reviewed",
        responses,
        evidence: [],
        findingIds: [],
        assetTag: asset.tag,
      };
      inspections.push(inspection);
      for (const item of failedItems) {
        buildAction({
          projectId: project.id,
          source: "infraction",
          category: "Equipment",
          priority: item.hazard.risk,
          location,
          description: `${item.hazard.remedy} (${asset.tag})`,
          createdAt: new Date(submitted.getTime() + 20 * 60_000),
        });
      }
    }
  }

  const curated = (opts: {
    projectId: string;
    templateId: string;
    inspectorId: string;
    location: SiteLocation;
    minutesAgo: number;
    fails: { itemId: string; note: string; conf: number; decision?: ReviewerDecision }[];
  }) => {
    const project = projects.find((pr) => pr.id === opts.projectId)!;
    const template = TEMPLATES.find((tp) => tp.id === opts.templateId)!;
    const submitted = new Date(now.getTime() - opts.minutesAgo * 60_000);
    const responses: ChecklistResponse[] = template.checklist.map((item) => {
      const f = opts.fails.find((x) => x.itemId === item.id);
      return f ? { itemId: item.id, value: "fail" as const, note: f.note } : { itemId: item.id, value: "pass" as const };
    });
    const first = template.checklist.find((i) => i.id === opts.fails[0].itemId)!;
    const evidence: Evidence = {
      id: `ev_${imgSeq}`,
      fileName: `IMG_${imgSeq++}.jpg`,
      scene: first.hazard.scene,
      capturedAt: iso(submitted),
    };
    const inspection: Inspection = {
      id: `i_${String(inspSeq++).padStart(4, "0")}`,
      projectId: project.id,
      templateId: template.id,
      inspectorId: opts.inspectorId,
      location: opts.location,
      date: dateOnly(submitted),
      submittedAt: iso(submitted),
      status: "submitted",
      responses,
      evidence: [evidence],
      findingIds: [],
    };
    let anyPending = false;
    for (const f of opts.fails) {
      const item = template.checklist.find((i) => i.id === f.itemId)!;
      const decision = f.decision ?? "pending";
      const created = new Date(submitted.getTime() + 2 * 60_000);
      const finding: Finding = {
        id: `f_${String(findSeq++).padStart(4, "0")}`,
        inspectionId: inspection.id,
        projectId: project.id,
        location: opts.location,
        hazardCategory: item.hazard.category,
        title: item.hazard.title,
        aiConfidence: f.conf,
        riskLevel: item.hazard.risk,
        aiExplanation: item.hazard.narrative,
        regulatoryReference: item.hazard.regulatoryReference,
        scene: item.hazard.scene,
        evidenceId: evidence.id,
        reviewerDecision: decision,
        createdAt: iso(created),
      };
      if (decision === "pending") anyPending = true;
      else {
        const reviewed = new Date(created.getTime() + 20 * 60_000);
        finding.reviewerId = "u_amon";
        finding.reviewedAt = iso(reviewed);
        const action = buildAction({
          projectId: project.id,
          source: "finding",
          findingId: finding.id,
          category: item.hazard.category,
          priority: finding.riskLevel,
          location: opts.location,
          description: `${item.hazard.remedy} — ${project.shortName}, ${opts.location.level} ${opts.location.zone}`,
          createdAt: reviewed,
        });
        action.status = "open";
        delete action.completedAt;
        delete action.verifiedAt;
        delete action.closedAt;
        finding.correctiveActionId = action.id;
      }
      findings.push(finding);
      inspection.findingIds.push(finding.id);
    }
    inspection.status = anyPending ? "submitted" : "reviewed";
    inspections.push(inspection);
  };

  curated({ projectId: "p_markey", templateId: "t_electrical", inspectorId: "u_marcus", location: { level: "L3", zone: "East" }, minutesAgo: 38,
    fails: [{ itemId: "c1", note: "Temporary power at the east riser, standing water nearby", conf: 0.91 }, { itemId: "c2", note: "Cord run across the corridor with tape repair", conf: 0.84 }] });
  curated({ projectId: "p_markey", templateId: "t_ppe", inspectorId: "u_justus", location: { level: "L5", zone: "West" }, minutesAgo: 95,
    fails: [{ itemId: "c4", note: "Two crew members working at the slab edge without tie-off", conf: 0.89 }, { itemId: "c2", note: "No vest on the hoist landing", conf: 0.77 }] });
  curated({ projectId: "p_markey", templateId: "t_electrical", inspectorId: "u_marcus", location: { level: "B1", zone: "South" }, minutesAgo: 150,
    fails: [{ itemId: "c4", note: "Panel B1-3 opened with no lock on the disconnect", conf: 0.93 }] });
  curated({ projectId: "p_lex_medical", templateId: "t_daily", inspectorId: "u_luis", location: { level: "L2", zone: "West" }, minutesAgo: 210,
    fails: [{ itemId: "c2", note: "Drywall pallets stacked in the corridor exit route", conf: 0.82 }, { itemId: "c5", note: "Extinguisher partially hidden behind stock", conf: 0.68 }] });
  curated({ projectId: "p_louisville", templateId: "t_electrical", inspectorId: "u_tanya", location: { level: "L1", zone: "South" }, minutesAgo: 55,
    fails: [{ itemId: "c3", note: "Distribution panel energized with no label", conf: 0.86 }] });
  curated({ projectId: "p_markey", templateId: "t_daily", inspectorId: "u_marcus", location: { level: "L2", zone: "North" }, minutesAgo: 300,
    fails: [{ itemId: "c1", note: "Conduit offcuts and packaging left in the walkway", conf: 0.72, decision: "approved" }] });

  const manualActions: { projectId: string; category: CorrectiveAction["category"]; priority: RiskLevel; description: string; daysAgo: number }[] = [
    { projectId: "p_markey", category: "Electrical", priority: "high", description: "Schedule LOTO refresher for the L3 East crew", daysAgo: 6 },
    { projectId: "p_markey", category: "Housekeeping", priority: "medium", description: "Add second dumpster and daily pick-up on L2 North", daysAgo: 9 },
    { projectId: "p_markey", category: "Fall Protection", priority: "high", description: "Install leading-edge guardrail at L5 West slab edge", daysAgo: 4 },
    { projectId: "p_lex_medical", category: "PPE", priority: "medium", description: "Restock eye protection at the L2 gang box", daysAgo: 5 },
    { projectId: "p_lex_medical", category: "Electrical", priority: "medium", description: "Replace temporary power distribution box on L3", daysAgo: 12 },
    { projectId: "p_louisville", category: "Electrical", priority: "high", description: "Re-route feeders away from wet slab on L1 South", daysAgo: 3 },
  ];
  for (const m of manualActions) {
    buildAction({
      projectId: m.projectId,
      source: "manual",
      category: m.category,
      priority: m.priority,
      description: m.description,
      createdAt: at(m.daysAgo, 9),
    });
  }

  // Give the featured field users a realistic personal workload.
  const kevinTasks = correctiveActions
    .filter((a) => a.projectId === "p_markey" && a.status === "open" && a.priority !== "critical" && a.assignedToId !== "u_justus")
    .slice(0, 3);
  for (const a of kevinTasks) a.assignedToId = "u_kevin";
  const kevinDone = correctiveActions.find((a) => a.projectId === "p_markey" && a.status === "completed" && a.assignedToId !== "u_kevin");
  if (kevinDone) kevinDone.assignedToId = "u_kevin";

  // Certifications ---------------------------------------------------------
  const certifications: Certification[] = [];
  let certSeq = 1;
  const certHolders = users.filter((u) => u.role === "WORKER" || u.role === "SUPERVISOR");
  for (const person of certHolders) {
    const heights = foremen.has(person.id) || chance(0.55);
    const lifts = person.title === "Lift Operator" || foremen.has(person.id) || chance(0.3);
    for (const c of CERT_TYPES) {
      if (c.type === "Fall Protection" && !heights) continue;
      if (c.type === "Aerial Lift Operator" && !lifts) continue;
      const r = rand();
      const offset = r < 0.07 ? -between(3, 60) : r < 0.21 ? between(2, 29) : between(35, 700);
      const expires = new Date(now.getTime() + offset * DAY);
      const issued = new Date(expires.getTime() - c.months * 30.4 * DAY);
      certifications.push({
        id: `cert_${String(certSeq++).padStart(3, "0")}`,
        userId: person.id,
        type: c.type,
        issuedOn: dateOnly(issued),
        expiresOn: dateOnly(expires),
      });
    }
  }

  // Permits ----------------------------------------------------------------
  const permits: Permit[] = [];
  let permitSeq = 1;
  const permitDescriptions: Record<PermitType, string[]> = {
    "Hot Work": ["Brazing refrigerant lines", "Cutting unistrut with abrasive saw", "Welding cable tray supports", "Soldering copper bus connections"],
    "Confined Space": ["Pulling feeders through vault", "Inspecting underground duct bank", "Terminating cable in switchgear pit"],
    Excavation: ["Trenching for duct bank", "Potholing for utility locate", "Excavating for light pole base"],
    "Energized Work": ["Testing energized MCC bucket", "Infrared scan of live switchgear", "Troubleshooting energized panelboard", "Meter installation on live service"],
  };
  const permitTypes: [PermitType, number][] = [
    ["Energized Work", 0.35],
    ["Hot Work", 0.3],
    ["Confined Space", 0.2],
    ["Excavation", 0.15],
  ];
  const pickPermitType = (): PermitType => {
    let r = rand();
    for (const [t, w] of permitTypes) {
      if (r < w) return t;
      r -= w;
    }
    return "Hot Work";
  };
  const permitRate: Record<string, number> = { p_markey: 0.55, p_lex_medical: 0.28, p_louisville: 0.2 };

  const addPermit = (project: Project, daysAgo: number, forceOpenToday = false) => {
    const type = pickPermitType();
    const start = at(daysAgo, forceOpenToday ? 7 : 7 + Math.floor(rand() * 3), Math.floor(rand() * 60));
    const hours = type === "Excavation" ? 24 * Math.ceil(between(1, 3)) : type === "Energized Work" ? between(3, 8) : between(6, 10);
    const expires = forceOpenToday ? new Date(now.getTime() + between(2, 7) * HOUR) : new Date(start.getTime() + hours * HOUR);
    const crew = crews[project.id];
    permits.push({
      id: `pm_${String(permitSeq++).padStart(4, "0")}`,
      projectId: project.id,
      type,
      location: pickLocation(project),
      description: pick(permitDescriptions[type]),
      issuedById: pick(crew.filter((id) => foremen.has(id))),
      approvedById: pick(reviewers),
      attendantId: type === "Hot Work" || type === "Confined Space" ? pick(crew.filter((id) => !foremen.has(id))) : undefined,
      startsAt: iso(start),
      expiresAt: iso(expires),
      closedAt:
        expires.getTime() < now.getTime() && !forceOpenToday
          ? iso(new Date(Math.min(now.getTime(), expires.getTime() + between(0.1, 1.5) * HOUR)))
          : undefined,
    });
  };
  for (let d = 83; d >= 1; d--) {
    const dow = at(d, 12).getDay();
    if (dow === 0 || dow === 6) continue;
    for (const project of projects) if (chance(permitRate[project.id])) addPermit(project, d);
  }
  for (let i = 0; i < 4; i++) addPermit(projects[0], 0, true);
  addPermit(projects[1], 0, true);
  addPermit(projects[2], 0, true);
  // two recent permits that expired without being closed out
  for (const daysAgo of [1, 3]) {
    addPermit(projects[0], daysAgo);
    const last = permits[permits.length - 1];
    last.closedAt = undefined;
    last.expiresAt = iso(at(daysAgo, 16));
  }

  // PPE ----------------------------------------------------------------------
  const ppeItems: PpeItem[] = [
    { id: "ppe_01", companyId: "co_besco", name: "Hard hats", received: 150, issued: 118, reorderPoint: 20, unitCost: 12.5 },
    { id: "ppe_02", companyId: "co_besco", name: "Hi-vis vests", received: 200, issued: 171, reorderPoint: 25, unitCost: 4.25 },
    { id: "ppe_03", companyId: "co_besco", name: "Safety glasses", received: 400, issued: 362, reorderPoint: 60, unitCost: 3.1 },
    { id: "ppe_04", companyId: "co_besco", name: "Cut-resistant gloves (pairs)", received: 300, issued: 241, reorderPoint: 40, unitCost: 6.8 },
    { id: "ppe_05", companyId: "co_besco", name: "Class 0 insulating gloves (pairs)", received: 60, issued: 49, reorderPoint: 12, unitCost: 58 },
    { id: "ppe_06", companyId: "co_besco", name: "Arc-rated face shields", received: 40, issued: 31, reorderPoint: 8, unitCost: 64 },
    { id: "ppe_07", companyId: "co_besco", name: "Arc-rated FR shirts", received: 120, issued: 98, reorderPoint: 20, unitCost: 42 },
    { id: "ppe_08", companyId: "co_besco", name: "Fall arrest harnesses", received: 50, issued: 42, reorderPoint: 8, unitCost: 138 },
    { id: "ppe_09", companyId: "co_besco", name: "Shock-absorbing lanyards", received: 60, issued: 44, reorderPoint: 10, unitCost: 72 },
    { id: "ppe_10", companyId: "co_besco", name: "Hearing protection (pairs)", received: 500, issued: 438, reorderPoint: 75, unitCost: 0.6 },
    { id: "ppe_11", companyId: "co_besco", name: "Dielectric boots (pairs)", received: 45, issued: 38, reorderPoint: 6, unitCost: 165 },
  ];

  // GC notices -----------------------------------------------------------------
  const gcNotices: GcNotice[] = [
    { id: "gc_01", projectId: "p_markey", trade: "Mechanical", issue: "Duct hangers installed across BESCO conduit racks on L3 East", impact: "Conduit run blocked; two crews idle", priority: "high", status: "open", raisedAt: iso(at(2, 10)), raisedById: "u_justus" },
    { id: "gc_02", projectId: "p_markey", trade: "Plumbing", issue: "Water intrusion into the B1 South electrical room", impact: "Switchgear exposed; MCC lineup at risk", priority: "high", status: "open", raisedAt: iso(at(1, 14)), raisedById: "u_marcus" },
    { id: "gc_03", projectId: "p_markey", trade: "Drywall", issue: "Board hung before rough-in inspection on L2 North", impact: "Walls reopened; about 3 days of rework", priority: "medium", status: "acknowledged", raisedAt: iso(at(6, 9)), raisedById: "u_justus", gcResponse: "Drywall foreman notified; reopening scheduled for Thursday." },
    { id: "gc_04", projectId: "p_markey", trade: "Fire Protection", issue: "Sprinkler drop conflicts with cable tray on L4 West", impact: "Tray reroute required", priority: "low", status: "resolved", raisedAt: iso(at(15, 11)), raisedById: "u_marcus", gcResponse: "Sprinkler drop relocated 14 inches east." },
    { id: "gc_05", projectId: "p_markey", trade: "Flooring", issue: "Adhesive fumes in L1 corridor during energized work", impact: "Ignition risk near live gear", priority: "medium", status: "resolved", raisedAt: iso(at(22, 8)), raisedById: "u_amon", gcResponse: "Adhesive application moved to second shift." },
    { id: "gc_06", projectId: "p_lex_medical", trade: "Framing", issue: "Studs installed in front of L2 electrical closet door", impact: "Panel access blocked", priority: "medium", status: "acknowledged", raisedAt: iso(at(4, 13)), raisedById: "u_luis", gcResponse: "Framing crew will relocate studs by Friday." },
    { id: "gc_07", projectId: "p_lex_medical", trade: "Concrete", issue: "Slab pour scheduled over embedded conduit sleeves", impact: "Sleeves at risk of being buried", priority: "high", status: "resolved", raisedAt: iso(at(11, 9)), raisedById: "u_omar", gcResponse: "Pour delayed one day for sleeve inspection." },
    { id: "gc_08", projectId: "p_louisville", trade: "Mechanical", issue: "Rooftop unit curb set without electrical coordination", impact: "Feeder route conflicts with curb", priority: "medium", status: "open", raisedAt: iso(at(3, 15)), raisedById: "u_tanya" },
    { id: "gc_09", projectId: "p_louisville", trade: "Site Utilities", issue: "Trench left open overnight near BESCO material laydown", impact: "Fall and access hazard", priority: "high", status: "acknowledged", raisedAt: iso(at(5, 7)), raisedById: "u_grace", gcResponse: "Barricades and lighting added; trench backfill Monday." },
  ];

  // Incident log ----------------------------------------------------------------
  const incidents: Incident[] = [
    {
      id: "inc_01",
      projectId: "p_markey",
      type: "near_miss",
      description: "Suspended load swung unexpectedly near L4 West as a crew member walked beneath the pick path.",
      location: { level: "L4", zone: "West" },
      involvedUserIds: ["u_marcus"],
      immediateAction: "Work paused; pick path re-flagged and a spotter assigned before the lift resumed.",
      oshaRecordable: false,
      lostTimeDays: 0,
      status: "closed",
      reportedById: "u_amon",
      reportedAt: iso(at(9, 11)),
      closedAt: iso(at(8, 15)),
    },
    {
      id: "inc_02",
      projectId: "p_markey",
      type: "first_aid",
      description: "Minor laceration to the hand while stripping conductor in the B1 South electrical room; treated on site.",
      location: { level: "B1", zone: "South" },
      involvedUserIds: ["u_kevin"],
      immediateAction: "Wound cleaned and bandaged by the site first-aid attendant; cut-resistant glove use reviewed with the crew.",
      oshaRecordable: false,
      lostTimeDays: 0,
      status: "closed",
      reportedById: "u_justus",
      reportedAt: iso(at(5, 14)),
      closedAt: iso(at(5, 16)),
    },
    {
      id: "inc_03",
      projectId: "p_lex_medical",
      type: "recordable",
      description: "Fall from a two-step platform ladder while pulling cable overhead on L2; twisted ankle.",
      location: { level: "L2", zone: "North" },
      involvedUserIds: ["u_omar"],
      immediateAction: "Worker assessed by site medic and sent for evaluation. Ladder inspected and cleared; toolbox talk on ladder setup scheduled.",
      oshaRecordable: true,
      lostTimeDays: 2,
      status: "investigating",
      reportedById: "u_luis",
      reportedAt: iso(at(3, 9)),
    },
    {
      id: "inc_04",
      projectId: "p_louisville",
      type: "property_damage",
      description: "Forklift backed into a temporary panel enclosure staged in the laydown yard, denting the cabinet.",
      location: { level: "Site", zone: "Laydown" },
      involvedUserIds: ["u_tanya"],
      immediateAction: "Enclosure tagged out and inspected before re-energizing; forklift travel lane re-marked.",
      oshaRecordable: false,
      lostTimeDays: 0,
      status: "open",
      reportedById: "u_grace",
      reportedAt: iso(at(1, 16)),
    },
  ];

  return {
    companies,
    users,
    projects,
    templates: TEMPLATES,
    inspections,
    findings,
    correctiveActions,
    certifications,
    permits,
    ppeItems,
    assets,
    gcNotices,
    incidents,
  };
}
