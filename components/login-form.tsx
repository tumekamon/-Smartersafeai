"use client";

import { useActionState, useRef } from "react";
import { login } from "@/lib/actions/auth";

export type DemoAccount = {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
  hue: number;
};

export function LoginForm({ accounts }: { accounts: DemoAccount[] }) {
  const [state, action, pending] = useActionState(login, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  function signInAs(email: string) {
    if (!emailRef.current || !passRef.current) return;
    emailRef.current.value = email;
    passRef.current.value = "demo1234";
    formRef.current?.requestSubmit();
  }

  return (
    <div>
      <p className="eyebrow mb-3">Explore as</p>
      <div className="grid grid-cols-2 gap-2.5">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={pending}
            onClick={() => signInAs(a.email)}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5 text-left transition-all hover:border-sidebar-accent hover:shadow-md disabled:opacity-60"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: `linear-gradient(135deg, hsl(${a.hue} 58% 46%), hsl(${(a.hue + 32) % 360} 60% 38%))` }}
            >
              {a.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{a.name}</span>
              <span className="block truncate text-[11px] text-foreground/50">{a.role}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-foreground/35">
        <span className="h-px flex-1 bg-border" />
        or sign in
        <span className="h-px flex-1 bg-border" />
      </div>

      <form ref={formRef} action={action} className="space-y-3.5">
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          required
          placeholder="Work email"
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-sidebar-accent"
        />
        <input
          ref={passRef}
          id="password"
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-sidebar-accent"
        />
        {state?.error && <p className="form-error">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-sidebar-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
