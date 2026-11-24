"use client";

import { useState } from "react";
import { reviewFindingAction } from "@/lib/actions/findings";
import type { Finding, ReviewerDecision, RiskLevel, User } from "@/lib/types";

const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];
const REJECT_REASONS = ["Not a hazard", "Duplicate", "Photo unclear", "Already fixed"];

/**
 * The safety manager's decision on one finding (design MP2 / X03, flow rule 2).
 * The safety manager decides *whether*; approving sends it to the site supervisor,
 * who decides *who* fixes it and *how fast*. Changing severity or rejecting needs a
 * reason, and the reporter sees it in My reports.
 *
 * `assignees`, `canAssign`, `defaultDue` and `defaultDescription` are still accepted
 * from older callers but no longer used: assigning moved to the supervisor.
 */
export function ReviewPanel({
  finding,
  next,
}: {
  finding: Finding;
  assignees?: User[];
  canAssign?: boolean;
  defaultDue?: string;
  defaultDescription?: string;
  next?: string;
}) {
  const [decision, setDecision] = useState<ReviewerDecision>("approved");
  const [risk, setRisk] = useState<RiskLevel>(finding.riskLevel);
  const [reason, setReason] = useState("");

  const choice = (value: ReviewerDecision, label: string) => (
    <button
      type="button"
      onClick={() => setDecision(value)}
      aria-pressed={decision === value}
      className={`min-h-11 rounded-full border-[1.5px] px-4 text-sm font-medium ${
        decision === value ? "border-brand bg-brand text-white" : "border-[rgba(11,31,51,0.2)] bg-surface"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form action={reviewFindingAction} className="flex flex-col gap-4">
      <input type="hidden" name="findingId" value={finding.id} />
      <input type="hidden" name="decision" value={decision} />
      {decision === "overridden" && <input type="hidden" name="riskLevel" value={risk} />}
      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex flex-wrap gap-2">
        {choice("approved", "Approve")}
        {choice("overridden", "Change severity")}
        {choice("rejected", "Reject")}
      </div>

      {decision === "overridden" && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">AI suggested {finding.riskLevel}</span>
          <div className="flex flex-wrap gap-2">
            {RISKS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRisk(r)}
                aria-pressed={risk === r}
                className={`min-h-11 rounded-full border-[1.5px] px-4 text-sm font-medium capitalize ${
                  risk === r ? "border-ink bg-ink text-white" : "border-[rgba(11,31,51,0.2)] bg-surface"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {decision === "rejected" && (
        <div className="flex flex-wrap gap-2">
          {REJECT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              aria-pressed={reason === r}
              className={`min-h-11 rounded-full border-[1.5px] px-4 text-sm font-medium ${
                reason === r ? "border-ink bg-ink text-white" : "border-[rgba(11,31,51,0.2)] bg-surface"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {decision !== "approved" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`reason-${finding.id}`} className="text-sm font-medium">
            Reason (required) · the reporter sees it
          </label>
          <textarea
            id={`reason-${finding.id}`}
            name="overrideReason"
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full resize-none rounded-lg border-[1.5px] border-[rgba(11,31,51,0.2)] bg-surface px-3.5 py-3 text-[15px]"
          />
        </div>
      )}

      <button
        type="submit"
        className={`min-h-[52px] rounded-full px-6 text-base font-semibold text-white ${decision === "rejected" ? "bg-status-critical" : "bg-brand"}`}
      >
        {decision === "rejected" ? "Reject as false alarm" : decision === "overridden" ? `Save as ${risk} · send to supervisor` : "Approve · send to supervisor"}
      </button>
      {decision !== "rejected" && (
        <p className="text-[13px] text-body">The site supervisor picks who fixes it and how fast.</p>
      )}
    </form>
  );
}
