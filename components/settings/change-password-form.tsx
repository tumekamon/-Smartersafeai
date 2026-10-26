"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/users";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const field = "min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-sidebar-accent";

  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="text-base font-bold">Change password</h2>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-foreground/80">Current password</span>
        <input name="current" type="password" required autoComplete="current-password" className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-foreground/80">New password (10+ characters)</span>
        <input name="next" type="password" required minLength={10} autoComplete="new-password" className={field} />
      </label>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-semibold tone-good">Password changed.</p>}
      <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-sidebar-accent px-6 text-[15px] font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
