"use client";

import { useRef, useState } from "react";
import { inviteUserAction } from "@/lib/actions/users";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "SAFETY_DIRECTOR", label: "Safety Director" },
  { value: "SAFETY_MANAGER", label: "Safety Manager" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "WORKER", label: "Field Worker" },
  { value: "CLIENT_VIEWER", label: "Client Viewer" },
] as const;

export function InviteUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await inviteUserAction(formData);
      formRef.current?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="firstName"
          required
          placeholder="First name"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
        <input
          name="lastName"
          required
          placeholder="Last name"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="email"
          type="email"
          required
          placeholder="Work email"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
        <input
          name="title"
          placeholder="Title (optional)"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          name="role"
          defaultValue="WORKER"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
          Add to workspace
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <p className="text-[11px] text-foreground/45">
        This is a prototype: new accounts sign in with their work email and the shared demo password, same as everyone else.
      </p>
    </form>
  );
}
