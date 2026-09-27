import type {
  CorrectiveActionStatus,
  IncidentStatus,
  IncidentType,
  InspectionStatus,
  ReviewerDecision,
  RiskLevel,
} from "@/lib/types";

type Tone = "good" | "warning" | "serious" | "critical" | "neutral" | "info";

function Badge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className={`badge-dot badge-${tone}`} style={{ background: "currentColor" }} />
      {label}
    </span>
  );
}

const riskTone: Record<RiskLevel, Tone> = {
  low: "good",
  medium: "warning",
  high: "serious",
  critical: "critical",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge tone={riskTone[level]} label={level} />;
}

const decisionTone: Record<ReviewerDecision, Tone> = {
  pending: "neutral",
  approved: "good",
  overridden: "info",
  rejected: "critical",
};

const decisionLabels: Record<ReviewerDecision, string> = {
  pending: "Pending review",
  approved: "Approved",
  overridden: "Overridden",
  rejected: "Rejected (false positive)",
};

export function DecisionBadge({ decision }: { decision: ReviewerDecision }) {
  return <Badge tone={decisionTone[decision]} label={decisionLabels[decision]} />;
}

const caStatusTone: Record<CorrectiveActionStatus, Tone> = {
  open: "warning",
  completed: "info",
  verified: "good",
  closed: "neutral",
};

export function CorrectiveActionStatusBadge({ status }: { status: CorrectiveActionStatus }) {
  return <Badge tone={caStatusTone[status]} label={status} />;
}

const inspectionStatusTone: Record<InspectionStatus, Tone> = {
  draft: "neutral",
  submitted: "warning",
  reviewed: "good",
};

export function InspectionStatusBadge({ status }: { status: InspectionStatus }) {
  return <Badge tone={inspectionStatusTone[status]} label={status} />;
}

const incidentStatusTone: Record<IncidentStatus, Tone> = {
  open: "warning",
  investigating: "info",
  closed: "good",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={incidentStatusTone[status]} label={status} />;
}

const incidentTypeLabels: Record<IncidentType, string> = {
  near_miss: "Near miss",
  first_aid: "First aid",
  recordable: "Recordable",
  property_damage: "Property damage",
  illness: "Illness",
};

const incidentTypeTone: Record<IncidentType, Tone> = {
  near_miss: "info",
  first_aid: "warning",
  recordable: "serious",
  property_damage: "neutral",
  illness: "serious",
};

export function IncidentTypeBadge({ type }: { type: IncidentType }) {
  return <Badge tone={incidentTypeTone[type]} label={incidentTypeLabels[type]} />;
}
