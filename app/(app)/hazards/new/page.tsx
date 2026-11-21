import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { workingSites } from "@/lib/site-focus";
import { HazardReportForm } from "@/components/hazard-report-form";
import { NoSiteNotice } from "@/components/site/no-site-notice";

export default async function NewHazardReportPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canSubmitInspections) redirect("/dashboard");
  const { project } = await searchParams;

  const sites = (await workingSites(user)).filter((p) => p.status === "active");
  const categories = getCompany(user.companyId)?.hazardCategories ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Report a hazard</h1>
      {sites.length === 0 ? (
        <NoSiteNotice action="report a hazard" />
      ) : (
      <HazardReportForm
        sites={sites.map(({ id, shortName, levels, zones }) => ({ id, shortName, levels, zones }))}
        categories={categories}
        initialSiteId={sites.some((s) => s.id === project) ? project : undefined}
        userId={user.id}
      />
      )}
    </div>
  );
}
