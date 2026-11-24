import Link from "next/link";
import { getCompany, listProjects, listTemplates, listUsers } from "@/lib/db";
import { safetyScore } from "@/lib/metrics";
import { ROLE_INFO } from "@/lib/roles";
import type { User } from "@/lib/types";

type Step = { title: string; detail: string; href: string; done: boolean };

/**
 * The owner's Home (design AP1 "Setup"). Lawrence sets the company up so everyone
 * else can work: company, sites, team, checklists, what each role sees. The safety
 * picture is one tap away rather than the first thing he lands on.
 */
export function AdminSetup({ user }: { user: User }) {
  const company = getCompany(user.companyId);
  const sites = listProjects(user.companyId).filter((p) => p.status === "active");
  const people = listUsers(user.companyId).filter((u) => u.active && !u.readOnly);
  const levels = new Set(people.map((u) => ROLE_INFO[u.role].level));
  const templates = listTemplates(user.companyId);
  const customised = Object.keys(company?.roleLayouts ?? {}).length > 0;
  const score = safetyScore(user.companyId).score;

  const steps: Step[] = [
    { title: "Company and logo", detail: company?.name ?? "Add your company", href: "/settings", done: Boolean(company?.name) },
    {
      title: "Sites",
      detail: sites.length ? `${sites.length} active · add another` : "Add your first site",
      href: sites.length ? "/projects" : "/projects/new",
      done: sites.length > 0,
    },
    {
      title: "Team",
      detail: `${people.length} ${people.length === 1 ? "person" : "people"} across ${levels.size} level${levels.size === 1 ? "" : "s"}`,
      href: "/settings/team",
      done: people.length > 1,
    },
    {
      title: "Checklist templates",
      detail: templates.length ? templates.slice(0, 4).map((t) => t.name).join(", ") : "Start from the construction pack",
      href: "/settings#templates",
      done: templates.length > 0,
    },
    {
      title: "What each role sees",
      detail: customised ? "Set for your company" : "Using defaults · review",
      href: "/settings/home",
      done: customised,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <span className="eyebrow">{company?.name} · L1 Admin</span>
        <h1 className="disp text-[38px] leading-none">Morning, {user.firstName}</h1>
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="eyebrow text-foreground">Setup</span>
          <span className="eyebrow">{doneCount} of {steps.length} done</span>
        </div>
        <div className="h-1 rounded-sm bg-tint">
          <div className="h-1 rounded-sm bg-brand" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>

      <ol className="flex flex-col border-t-2 border-brand">
        {steps.map((s) => (
          <li key={s.title}>
            <Link href={s.href} className="flex min-h-[64px] items-center gap-3.5 border-b border-border py-3.5">
              {s.done ? (
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-status-good" aria-label="Done">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                </span>
              ) : (
                <span className="h-[26px] w-[26px] shrink-0 rounded-full border-2 border-[#c9d3de]" aria-label="Not done" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-base font-semibold">{s.title}</span>
                <span className="truncate text-sm text-body">{s.detail}</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          </li>
        ))}
      </ol>

      <Link href="/dashboard?view=safety" className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-surface px-4 text-[15px]">
        <span>See the safety picture</span>
        <span className="eyebrow text-brand">Score {score}</span>
      </Link>
    </div>
  );
}
