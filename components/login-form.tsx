"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="demo1234"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        />
      </div>

      {state?.error && (
        <p className="form-error">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
