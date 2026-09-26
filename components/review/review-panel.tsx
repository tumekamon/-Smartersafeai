"use client";

import { useState } from "react";
import { reviewFindingAction } from "@/lib/actions/findings";
import type { Finding, ReviewerDecision, RiskLevel, User } from "@/lib/types";
import { IconCheck, IconEye, IconX } from "@/components/ui/icons";

const OPTIONS: { value: ReviewerDecision; label: string; hint: string; Icon: typeof IconCheck; color: string }[] = [
  { value: "approved", label: "Approve", hint: "Confirmed hazard", Icon: IconCheck, color: "var(--status-good)" },
  { value: "overridden", label: "Override", hint: "Change severity", Icon: IconEye, color: "var(--chart-series-1)" },
  { value: "rejected", label: "Reject", hint: "False positive", Icon: IconX, color: "var(--status-critical)" },
];

const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];

export function ReviewPanel({
  finding,
  assignees,
  canAssign,
  defaultDue,
  defaultDescription,
  next,
}: {
  finding: Finding;
  assignees: User[];
  canAssign: boolean;
  defaultDue: string;
  defaultDescription: string;
  next?: string;
}) {
  const [decision, setDecision] = useState<ReviewerDecision>("approved");
  const assigning = canAssign && (decision === "approved" || decision === "overridden");

  return (
    <form action={reviewFindingAction} className="space-y-4">
      <input type="hidden" name="findingId" value={finding.id} />
      <input type="hidden" name="decision" value={decision} />
      {next && <input type="hidden" name="next" value={next} />}

      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const active = decision === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setDecision(o.value)}
              className="rounded-xl border p-3 text-left transition-all"
              style={{
                borderColor: active ? o.color : "var(--border)",
                background: active ? `color-mix(in srgb, ${o.color} 10%, var(--surface))` : "var(--surface)",
                boxShadow: active ? `0 0 0 1px ${o.color}` : undefined,
              }}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: active ? o.color : undefined }}>
                <o.Icon width={15} height={15} />
                {o.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-foreground/50">{o.hint}</span>
            </button>
          );
        })}
      </div>

      {decision === "overridden" && (
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">Severity</label>
            <select
              name="riskLevel"
              defaultValue={finding.riskLevel}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm capitalize"
            >
              {RISKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/60">Reason (required)</label>
            <input
              name="overrideReason"
              required
              placeholder="Why is the AI assessment being changed?"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {assigning && (
        <div className="space-y-3 rounded-xl bg-surface-muted p-3.5">
          <p className="eyebrow">Assign corrective action</p>
          <input
            name="description"
            defaultValue={defaultDescription}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <select name="assignedToId" required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} · {u.title}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="date"
              name="dueDate"
              defaultValue={defaultDue}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-sidebar-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {decision === "rejected" ? "Dismiss finding" : assigning ? "Confirm and assign" : "Confirm decision"}
      </button>
    </form>
  );
}
