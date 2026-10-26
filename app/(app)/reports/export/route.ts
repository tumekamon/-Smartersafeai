import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { buildReport, REPORT_PERIODS, reportCsv } from "@/lib/reports";
import { siteIdsFor } from "@/lib/scope";

/** CSV of the same report, for spreadsheets. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canViewReports) return new Response("Not allowed", { status: 403 });

  const url = new URL(request.url);
  const site = url.searchParams.get("site") ?? undefined;
  const days = Number(url.searchParams.get("days"));
  const period = (REPORT_PERIODS as readonly number[]).includes(days) ? days : 30;
  const projectId = site && siteIdsFor(user).has(site) ? site : undefined;

  const csv = reportCsv(buildReport(user, projectId, period));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="smartsafe-report-${projectId ?? "all-sites"}-${period}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
