"use client";

import { createCorrectiveActionAction } from "@/lib/actions/corrective-actions";
import type { User } from "@/lib/types";

export function CreateCorrectiveActionForm({
  projectId,
  findingId,
  defaultDescription,
  users,
}: {
  projectId: string;
  findingId?: string;
  defaultDescription?: string;
  users: User[];
}) {
  return (
    <form
      action={createCorrectiveActionAction}
      className="mt-3 space-y-3 rounded-lg border border-dashed border-border p-3"
    >
      <input type="hidden" name="projectId" value={projectId} />
      {findingId && <input type="hidden" name="findingId" value={findingId} />}

      <div>
        <label className="mb-1 block text-xs font-medium text-foreground/60">
          Corrective action
        </label>
        <input
          name="description"
          required
          defaultValue={defaultDescription}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-foreground/60">
            Assign to
          </label>
          <select
            name="assignedToId"
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role.replaceAll("_", " ")})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-foreground/60">Due date</label>
          <input
            type="date"
            name="dueDate"
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </div>
      </div>
      <button
        type="submit"
        className="rounded-md bg-sidebar-accent px-3 py-1.5 text-sm font-medium text-white"
      >
        Create corrective action
      </button>
    </form>
  );
}
