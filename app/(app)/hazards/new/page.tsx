import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { workingSites } from "@/lib/site-focus";
import { HazardReportForm } from "@/components/hazard-report-form";
import { NoSiteNotice } from "@/components/site/no-site-notice";
import Link from "next/link";
import { IconX } from "@/components/ui/icons";

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
    <div className="mx-auto flex max-w-xl flex-col gap-[26px]">
      <header className="flex flex-col gap-3.5">
        <Link href="/dashboard" className="ds-back self-start">
          <IconX width={18} height={18} strokeWidth={2} /> Cancel
        </Link>
        <h1 className="disp text-[36px] leading-none">Report a hazard</h1>
      </header>
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
