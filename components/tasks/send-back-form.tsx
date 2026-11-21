"use client";

import { useActionState, useState } from "react";
import { sendBackTaskAction } from "@/lib/actions/corrective-actions";

/** For the checker: return the fix to the assignee with what's still missing. */
export function SendBackForm({ taskId }: { taskId: string }) {
  const [state, action, pending] = useActionState(sendBackTaskAction, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full rounded-xl text-sm font-bold text-status-critical ring-1 ring-status-critical/30 hover:bg-status-critical/5"
      >
        Send back
      </button>
    );
  }
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="correctiveActionId" value={taskId} />
      <textarea
        name="note"
        rows={3}
        required
        maxLength={300}
        autoFocus
        placeholder="What still needs doing?"
        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-sidebar-accent"
      />
      {state?.error && <p className="text-sm font-medium text-status-critical">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 flex-1 rounded-xl text-sm font-semibold hover:bg-surface-muted">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="min-h-11 flex-1 rounded-xl bg-status-critical text-sm font-bold text-white disabled:opacity-60">
          {pending ? "Sending…" : "Send back"}
        </button>
      </div>
    </form>
  );
}
