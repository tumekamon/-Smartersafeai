import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getFinding, getUser } from "@/lib/db";
import { accessibleProject, peopleFor, sitesFor, worksOnSite } from "@/lib/scope";
import { getCapabilities } from "@/lib/authz";
import { createCorrectiveActionAction } from "@/lib/actions/corrective-actions";
import { DEFAULT_WINDOW, FIX_WINDOWS } from "@/lib/fix-window";

/**
 * Assign a fix (design S04, flow rule 2). From "To assign" it arrives with a finding:
 * the hazard is already decided, so the supervisor only picks who and how fast.
 * Without a finding it's a job the supervisor gives out directly.
 */
export default async function NewCorrectiveActionPage({
  searchParams,
}: {
  searchParams: Promise<{ findingId?: string; projectId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canCreateCorrectiveActions) redirect("/dashboard");

  const { findingId, projectId: projectParam } = await searchParams;
  const finding = findingId ? getFinding(findingId) : undefined;
  if (findingId && !finding) notFound();
  if (finding?.correctiveActionId) redirect(`/corrective-actions/${finding.correctiveActionId}`);

  const sites = sitesFor(user);
  const project = accessibleProject(user, finding?.projectId ?? projectParam ?? (sites.length === 1 ? sites[0].id : undefined));
  if (finding && !project) notFound();

  const crew = project
    ? peopleFor(user)
        // The site's crew only: office roles (admin, safety) see every site but don't fix on it.
        .filter((p) => (p.role === "WORKER" || p.role === "SUPERVISOR") && worksOnSite(p, project) && p.id !== user.id)
        .sort((a, b) => a.role.localeCompare(b.role) || a.lastName.localeCompare(b.lastName))
    : [];
  const reviewer = finding?.reviewerId ? getUser(finding.reviewerId) : undefined;
  const defaultWindow = DEFAULT_WINDOW[finding?.riskLevel ?? "medium"];
  const chip = "flex min-h-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[rgba(11,31,51,0.2)] bg-surface px-4 text-[15px] font-medium has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white";
  const field = "min-h-[52px] w-full rounded-lg border-[1.5px] border-[rgba(11,31,51,0.2)] bg-surface px-3.5 text-base";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link href="/assign" className="inline-flex min-h-11 items-center text-[15px] font-medium text-brand">← Work</Link>
      <div className="flex flex-col gap-2.5">
        {finding && (
          <span className="eyebrow text-brand">
            {finding.source === "checklist" ? "Failed checklist item" : `Approved by ${reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "safety"}`} · {finding.riskLevel}
          </span>
        )}
        <h1 className="disp text-[34px] leading-none">Assign a fix</h1>
      </div>

      {!project ? (
        <form className="flex flex-col gap-3">
          <label htmlFor="projectId" className="text-[15px] font-medium">Which site?</label>
          <select id="projectId" name="projectId" required defaultValue="" className={field}>
            <option value="" disabled>Choose a site…</option>
            {sites.map((p) => <option key={p.id} value={p.id}>{p.shortName}</option>)}
          </select>
          <button type="submit" className="min-h-[52px] rounded-full bg-brand px-6 font-semibold text-white">Next</button>
        </form>
      ) : (
        <form action={createCorrectiveActionAction} className="flex flex-col gap-6">
          <input type="hidden" name="projectId" value={project.id} />
          {finding && <input type="hidden" name="findingId" value={finding.id} />}

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-[15px] font-medium">What needs fixing</label>
            <textarea
              id="description"
              name="description"
              required
              rows={2}
              defaultValue={finding ? `${finding.title}${finding.location ? ` — ${finding.location.level} ${finding.location.zone}` : ""}` : ""}
              className={`${field} py-3`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="assignedToId" className="text-[15px] font-medium">Who</label>
            <select id="assignedToId" name="assignedToId" required defaultValue="" className={field}>
              <option value="" disabled>Choose someone on {project.shortName}…</option>
              {crew.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.title}</option>
              ))}
            </select>
            <span className="text-[13px] text-body">Only people on this site&apos;s crew are listed.</span>
          </div>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-[15px] font-medium">Fix within</legend>
            <div className="grid grid-cols-4 gap-2">
              {FIX_WINDOWS.map((w) => (
                <label key={w.id} className={chip}>
                  <input type="radio" name="window" value={w.id} defaultChecked={w.id === defaultWindow} className="sr-only" />
                  {w.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="min-h-[54px] rounded-full bg-brand px-6 text-base font-semibold text-white">Assign</button>
          <p className="-mt-3 text-center text-[13px] text-body">They see it on My Day straight away, with the time counting down.</p>
        </form>
      )}
    </div>
  );
}
