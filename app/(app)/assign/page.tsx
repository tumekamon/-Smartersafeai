import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject, getUser } from "@/lib/db";
import { findingsToAssign } from "@/lib/to-assign";
import { workingSiteIds } from "@/lib/site-focus";
import { timeAgo } from "@/lib/format";
import { WorkTabs } from "@/components/work-tabs";

const DOT = {
  critical: "var(--status-critical)",
  high: "var(--status-serious)",
  medium: "var(--status-warning)",
  low: "var(--status-good)",
} as const;

/**
 * "To assign" (design S02, flow rule 2): confirmed hazards on this person's sites
 * that nobody has been given yet. Tapping one opens Assign a fix with it filled in.
 */
export default async function AssignPage() {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  if (!caps.canCreateCorrectiveActions || caps.isReadOnly) redirect("/work");

  const sites = await workingSiteIds(user);
  const items = findingsToAssign(user).filter((f) => sites.has(f.projectId));

  return (
    <div className="flex flex-col gap-6">
      <WorkTabs user={user} caps={caps} active="assign" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Work / To assign</span>
          <h1 className="disp text-4xl leading-none">{items.length === 0 ? "Nothing to assign" : `${items.length} to assign`}</h1>
        </div>
        <Link href="/corrective-actions/new" className="inline-flex min-h-12 items-center rounded-full border-[1.5px] border-brand px-5 font-semibold text-brand">
          Assign a new job
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-body">Confirmed hazards land here until you pick who fixes them and how fast.</p>
      ) : (
        <ul className="flex flex-col border-t-2 border-brand">
          {items.map((f) => {
            const site = getProject(f.projectId);
            const by = f.reviewerId ? getUser(f.reviewerId) : undefined;
            return (
              <li key={f.id}>
                <Link href={`/corrective-actions/new?findingId=${f.id}`} className="flex min-h-[64px] items-center gap-3.5 border-b border-border py-3.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[f.riskLevel] }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-semibold">{f.title}</span>
                    <span className="text-sm text-body">
                      {site?.shortName} · {f.location.level} {f.location.zone} ·{" "}
                      {f.source === "checklist" ? "failed checklist item" : `approved by ${by?.firstName ?? "safety"}`}
                    </span>
                  </span>
                  <span className="eyebrow hidden sm:block">{timeAgo(new Date(f.reviewedAt ?? f.createdAt).getTime())}</span>
                  <span className="eyebrow text-brand">Assign →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
