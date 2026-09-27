"use client";

import { setUserActiveAction, updateUserRoleAction } from "@/lib/actions/users";
import { Avatar } from "@/components/ui/avatar";
import type { User } from "@/lib/types";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "SAFETY_DIRECTOR", label: "Safety Director" },
  { value: "SAFETY_MANAGER", label: "Safety Manager" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "WORKER", label: "Field Worker" },
  { value: "CLIENT_VIEWER", label: "Client Viewer" },
] as const;

export function TeamRoster({ members, currentUserId }: { members: User[]; currentUserId: string }) {
  return (
    <ul className="divide-y divide-border">
      {members.map((m) => {
        const isSelf = m.id === currentUserId;
        return (
          <li key={m.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 ${m.active ? "" : "opacity-50"}`}>
            <Avatar person={m} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.firstName} {m.lastName}
                {isSelf && <span className="ml-1.5 text-[11px] font-normal text-foreground/40">(you)</span>}
              </p>
              <p className="truncate text-xs text-foreground/50">{m.email} · {m.title}</p>
            </div>

            <form action={updateUserRoleAction}>
              <input type="hidden" name="userId" value={m.id} />
              <select
                name="role"
                defaultValue={m.role}
                disabled={isSelf}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs disabled:opacity-60"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </form>

            <form action={setUserActiveAction}>
              <input type="hidden" name="userId" value={m.id} />
              <input type="hidden" name="active" value={(!m.active).toString()} />
              <button
                type="submit"
                disabled={isSelf}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  m.active ? "bg-surface-muted text-critical hover:bg-red-500/10" : "bg-surface-muted text-foreground/60 hover:bg-sidebar-accent hover:text-white"
                }`}
              >
                {m.active ? "Deactivate" : "Reactivate"}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
