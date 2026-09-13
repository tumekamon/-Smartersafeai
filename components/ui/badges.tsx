import type {
  CorrectiveActionStatus,
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
