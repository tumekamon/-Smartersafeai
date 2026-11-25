"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/users";

/** Change password, laid out as a plain form; the profile screen puts it under an "Account" row. */
export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">Current password</span>
        <input name="current" type="password" required autoComplete="current-password" className="ds-field" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">New password (10+ characters)</span>
        <input name="next" type="password" required minLength={10} autoComplete="new-password" className="ds-field" />
      </label>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.ok && (
        <p role="status" className="text-sm font-semibold tone-good">
          Password changed.
        </p>
      )}
      <button type="submit" disabled={pending} className="ds-btn ds-btn-primary min-h-12 text-[15px]">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
