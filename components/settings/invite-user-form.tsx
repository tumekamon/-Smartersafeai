"use client";

import { useRef, useState } from "react";
import { inviteUserAction } from "@/lib/actions/users";

const LEVELS = [
  { value: "WORKER", label: "L4 Worker" },
  { value: "SUPERVISOR", label: "L3 Supervisor" },
  { value: "SAFETY_MANAGER", label: "L2 Safety mgr" },
] as const;

/**
 * Invite (design AP3): name, email or phone, a level and a site. Workers and
 * supervisors join that site's crew straight away; safety managers see every site.
 */
export function InviteUserForm({ sites, defaultSite }: { sites: { id: string; name: string }[]; defaultSite?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [level, setLevel] = useState<(typeof LEVELS)[number]["value"]>("WORKER");
  const [site, setSite] = useState(defaultSite ?? sites[0]?.id ?? "");
  const siteName = sites.find((s) => s.id === site)?.name;
  const field = "min-h-12 w-full rounded-lg border-[1.5px] border-[rgba(11,31,51,0.2)] bg-surface px-3 text-base";

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSent(null);
    try {
      await inviteUserAction(formData);
      setSent(String(formData.get("name") ?? ""));
      // React resets the form after the action; remount it so the picked level and site show again.
      setRound((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <form key={round} ref={formRef} action={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <input type="hidden" name="role" value={level} />
      {level !== "SAFETY_MANAGER" && <input type="hidden" name="projectId" value={site} />}
      <label htmlFor="invite-name" className="text-sm font-medium">Invite someone</label>
      <input id="invite-name" name="name" required placeholder="Full name" autoComplete="off" className={field} />
      <input name="email" required placeholder="Email or phone" autoComplete="off" aria-label="Email or phone" className={field} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Level">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            aria-pressed={level === l.value}
            onClick={() => setLevel(l.value)}
            className={`min-h-[42px] rounded-full border-[1.5px] px-3 text-sm font-medium ${level === l.value ? "border-brand bg-brand text-white" : "border-[rgba(11,31,51,0.2)] bg-surface"}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      {level !== "SAFETY_MANAGER" && sites.length > 1 && (
        <select value={site} onChange={(e) => setSite(e.target.value)} aria-label="Site" className={field}>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <button type="submit" className="min-h-12 rounded-full bg-brand px-5 font-semibold text-white">
        {level === "SAFETY_MANAGER" ? "Send invite · all sites" : `Send invite to ${siteName ?? "site"}`}
      </button>
      {sent && <p className="text-sm text-status-good">Invite sent to {sent}.</p>}
      {error && <p className="form-error">{error}</p>}
      <p className="text-[12px] text-body">Prototype: new people sign in with the shared demo password.</p>
    </form>
  );
}
