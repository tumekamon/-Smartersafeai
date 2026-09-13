"use client";

import { useState } from "react";
import { reviewFindingAction } from "@/lib/actions/findings";
import type { Finding, ReviewerDecision } from "@/lib/types";
import { DecisionBadge, RiskBadge } from "@/components/ui/badges";

const DECISIONS: { value: ReviewerDecision; label: string }[] = [
  { value: "approved", label: "Approve — confirmed hazard" },
  { value: "overridden", label: "Override — different severity/finding" },
  { value: "rejected", label: "Reject — false positive" },
];

export function FindingReview({
  finding,
  canReview,
}: {
  finding: Finding;
  canReview: boolean;
}) {
  const [decision, setDecision] = useState<ReviewerDecision>("approved");

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{finding.hazardCategory}</p>
          <p className="mt-0.5 text-xs text-foreground/50">{finding.regulatoryReference}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={finding.riskLevel} />
          <DecisionBadge decision={finding.reviewerDecision} />
        </div>
      </div>

      <p className="mt-3 text-sm text-foreground/70">{finding.aiExplanation}</p>
      <p className="mt-2 text-xs text-foreground/50">
        AI confidence: {Math.round(finding.aiConfidence * 100)}%
      </p>

      {finding.reviewerDecision !== "pending" ? (
        <p className="mt-3 border-t border-border pt-3 text-xs text-foreground/50">
          {finding.overrideReason ? `Override reason: ${finding.overrideReason}` : "Reviewed."}
        </p>
      ) : !canReview ? (
        <p className="mt-3 border-t border-border pt-3 text-xs text-foreground/50">
          Waiting on a safety professional (Admin, Safety Director, or Safety Manager) to review
          this finding.
        </p>
      ) : (
        <form action={reviewFindingAction} className="mt-4 space-y-3 border-t border-border pt-3">
          <input type="hidden" name="findingId" value={finding.id} />
          <div className="flex flex-wrap gap-3">
            {DECISIONS.map((d) => (
              <label key={d.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="decision"
                  value={d.value}
                  checked={decision === d.value}
                  onChange={() => setDecision(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
          {decision === "overridden" && (
            <textarea
              name="overrideReason"
              required
              placeholder="Explain why the AI finding is being overridden (required)"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
              rows={2}
            />
          )}
          <button
            type="submit"
            className="rounded-md bg-sidebar-accent px-3 py-1.5 text-sm font-medium text-white"
          >
            Save review decision
          </button>
        </form>
      )}
    </div>
  );
}
