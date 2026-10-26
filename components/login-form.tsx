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

/** One row per role level; read-only client accounts sit apart, since they aren't a level. */
export type DemoLevel = { level: number; label: string; accounts: DemoAccount[] };

export function LoginForm({ levels, clients }: { levels: DemoLevel[]; clients: DemoAccount[] }) {
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
      <div className="space-y-2">
        {levels.map((l) => (
          <div key={l.level} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2 pl-3">
            <span className="flex w-24 shrink-0 flex-col">
              <span className="text-[11px] font-bold text-foreground/50">L{l.level}</span>
              <span className="text-sm font-bold leading-tight">{l.label}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap justify-end gap-1.5">
              {l.accounts.map((a) => (
                <AccountButton key={a.id} account={a} disabled={pending} onPick={signInAs} />
              ))}
            </span>
          </div>
        ))}
      </div>
      {clients.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground/60">Client · read-only</span>
          <span className="flex flex-wrap gap-1.5">
            {clients.map((a) => (
              <AccountButton key={a.id} account={a} disabled={pending} onPick={signInAs} />
            ))}
          </span>
        </div>
      )}

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

function AccountButton({ account: a, disabled, onPick }: { account: DemoAccount; disabled: boolean; onPick: (email: string) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(a.email)}
      title={`${a.name} · ${a.role}`}
      className="flex min-h-11 items-center gap-2 rounded-xl px-2 pr-3 text-left transition-colors hover:bg-surface-muted disabled:opacity-60"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: `linear-gradient(135deg, hsl(${a.hue} 58% 46%), hsl(${(a.hue + 32) % 360} 60% 38%))` }}
      >
        {a.initials}
      </span>
      <span className="truncate text-sm font-semibold">{a.name.split(" ")[0]}</span>
    </button>
  );
}
