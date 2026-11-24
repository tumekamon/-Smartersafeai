import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { accessibleProject, sitesFor } from "@/lib/scope";
import { dailySnapshot, todaysReport } from "@/lib/daily-report";
import { submitDailyReport } from "@/lib/actions/daily-report";

/** Daily site report, due 08:00 (design S05). The numbers fill themselves in. */
export default async function DailyReportPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  if (caps.isReadOnly || !caps.canVerifyActions) redirect("/dashboard");

  const { project: projectParam } = await searchParams;
  const sites = sitesFor(user);
  const project = accessibleProject(user, projectParam ?? sites[0]?.id);
  if (!project) redirect("/dashboard");

  const snap = dailySnapshot(project);
  const sent = todaysReport(project);
  const day = new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  const kv = "flex justify-between gap-3 border-b border-border py-3 text-[15px]";
  const field = "w-full resize-none rounded-lg border-[1.5px] border-[rgba(11,31,51,0.2)] bg-surface px-3.5 py-3 text-[15px]";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-[15px] font-medium text-brand">← Site</Link>
      <div className="flex flex-col gap-2.5">
        <span className={`eyebrow ${sent ? "text-status-good" : "text-status-critical"}`}>
          {sent ? `Sent ${new Date(sent.submittedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · you can update it` : `Due 08:00 · ${day}`}
        </span>
        <h1 className="disp text-[34px] leading-none">Daily site report</h1>
      </div>

      {sites.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sites.map((s) => (
            <Link
              key={s.id}
              href={`/daily-report?project=${s.id}`}
              aria-current={s.id === project.id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-sm font-medium ${s.id === project.id ? "border-brand bg-brand text-white" : "border-[rgba(11,31,51,0.2)] bg-surface"}`}
            >
              {s.shortName}
            </Link>
          ))}
        </div>
      )}

      <section className="flex flex-col">
        <div className="section-rule flex justify-between">
          <span className="eyebrow text-foreground">01 / Filled in for you</span>
          <span className="eyebrow">{project.shortName}</span>
        </div>
        <div className={kv}><span className="text-body">Crew checked in</span><span className="font-semibold">{snap.crewIn} of {snap.crewTotal}</span></div>
        <div className={kv}><span className="text-body">Hazards reported, last 24h</span><span className="font-semibold">{snap.hazardsLastDay}</span></div>
        <div className={kv}><span className="text-body">Open fixes · overdue</span><span className={`font-semibold ${snap.overdueFixes ? "text-status-critical" : ""}`}>{snap.openFixes} · {snap.overdueFixes}</span></div>
        <div className={kv}><span className="text-body">Permits active</span><span className="text-right font-semibold">{snap.permitsToday.length ? snap.permitsToday.join(", ") : "None"}</span></div>
      </section>

      <form action={submitDailyReport} className="flex flex-col gap-4">
        <input type="hidden" name="projectId" value={project.id} />
        <span className="eyebrow section-rule text-foreground">02 / From you</span>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="highRiskWork" className="text-sm font-medium">High-risk work planned today</label>
          <textarea id="highRiskWork" name="highRiskWork" required rows={2} defaultValue={sent?.highRiskWork} placeholder="Energizing a panel, work at height, hot work… or none" className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-sm font-medium">Anything the safety manager should know (optional)</label>
          <textarea id="note" name="note" rows={2} defaultValue={sent?.note} className={field} />
        </div>
        <button type="submit" className="min-h-[54px] rounded-full bg-brand px-6 text-base font-semibold text-white">
          {sent ? "Update today's report" : "Send to safety"}
        </button>
        <p className="-mt-2 text-center text-[13px] text-body">Goes to the safety manager&apos;s Home.</p>
      </form>
    </div>
  );
}
