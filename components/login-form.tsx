"use client";

import { useActionState, useRef } from "react";
import { login } from "@/lib/actions/auth";

export type DemoAccount = {
  id: string;
  level: number;
  name: string;
  role: string;
  email: string;
};

const field =
  "h-[52px] w-full rounded-lg border-[1.5px] border-[rgba(11,31,51,0.2)] bg-surface px-3.5 text-base outline-none focus:border-brand";

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
    <div className="flex flex-col gap-10">
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-[15px] font-medium">Work email</label>
          <input ref={emailRef} id="email" name="email" type="email" required autoComplete="username" className={field} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-[15px] font-medium">Password</label>
          <input ref={passRef} id="password" name="password" type="password" required autoComplete="current-password" className={field} />
        </div>
        {state?.error && <p className="form-error">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex min-h-[52px] items-center justify-center rounded-full bg-brand px-6 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="flex flex-col">
        <span className="eyebrow section-rule">Demo accounts · password demo1234</span>
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={pending}
            onClick={() => signInAs(a.email)}
            className="flex min-h-[52px] items-center gap-3.5 border-b border-border text-left disabled:opacity-60"
          >
            <span className="eyebrow w-6 text-brand">L{a.level}</span>
            <span className="flex-1 text-base">{a.name}</span>
            <span className="text-sm text-body">{a.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
