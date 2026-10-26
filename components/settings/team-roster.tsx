"use client";

import Link from "next/link";
import { setUserActiveAction, setUserReadOnlyAction, toggleExtraPermissionAction, updateUserRoleAction } from "@/lib/actions/users";
import { EXTRA_PERMISSIONS, ROLE_INCLUDES, ROLE_OPTIONS } from "@/lib/roles";
import { Avatar } from "@/components/ui/avatar";
import type { User } from "@/lib/types";

export function TeamRoster({
  members,
  currentUserId,
  sitesByUser = {},
}: {
  members: User[];
  currentUserId: string;
  sitesByUser?: Record<string, { id: string; name: string }[]>;
}) {
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
              {ROLE_INCLUDES[m.role].length < EXTRA_PERMISSIONS.length && !m.readOnly && (
                <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Extra permissions">
                  {EXTRA_PERMISSIONS.filter((p) => !ROLE_INCLUDES[m.role].includes(p.id)).map((p) => {
                    const on = (m.extraPermissions ?? []).includes(p.id);
                    return (
                      <form key={p.id} action={toggleExtraPermissionAction}>
                        <input type="hidden" name="userId" value={m.id} />
                        <input type="hidden" name="permission" value={p.id} />
                        <button
                          type="submit"
                          aria-pressed={on}
                          title={on ? `Remove: ${p.label}` : `Also allow: ${p.label}`}
                          className={`min-h-8 rounded-full px-2.5 text-[11px] font-bold transition-colors ${
                            on ? "bg-brand text-white" : "bg-surface-muted text-foreground/55 hover:text-foreground"
                          }`}
                        >
                          {on ? "✓ " : "+ "}
                          {p.label}
                        </button>
                      </form>
                    );
                  })}
                </div>
              )}
              {(m.role === "SUPERVISOR" || m.role === "WORKER") && !m.readOnly && (
                <p className="mt-1 flex flex-wrap gap-1">
                  {(sitesByUser[m.id] ?? []).length === 0 ? (
                    <span className="text-[11px] font-semibold text-foreground/45">No site yet · sees all sites</span>
                  ) : (
                    sitesByUser[m.id].map((s) => (
                      <Link key={s.id} href={`/projects/${s.id}?tab=crew`} className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/70 hover:text-foreground">
                        {s.name}
                      </Link>
                    ))
                  )}
                </p>
              )}
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

            <form action={setUserReadOnlyAction}>
              <input type="hidden" name="userId" value={m.id} />
              <input type="hidden" name="readOnly" value={(!m.readOnly).toString()} />
              <button
                type="submit"
                disabled={isSelf}
                aria-pressed={m.readOnly === true}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  m.readOnly ? "bg-foreground text-background" : "bg-surface-muted text-foreground/60 hover:text-foreground"
                }`}
              >
                Read-only
              </button>
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
