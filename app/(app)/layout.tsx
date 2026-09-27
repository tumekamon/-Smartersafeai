import { getCurrentUser } from "@/lib/dal";
import { getCompany, listFindings, listProjects } from "@/lib/db";
import { getCapabilities } from "@/lib/authz";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const company = getCompany(user.companyId);
  const pendingReviews = getCapabilities(user.role).canReviewFindings
    ? listFindings().filter((f) => f.reviewerDecision === "pending").length
    : 0;

  return (
    <div
      className="flex min-h-screen w-full bg-background"
      style={company ? ({ "--brand": company.primaryColor } as React.CSSProperties) : undefined}
    >
      <Sidebar role={user.role} companyName={company?.name ?? ""} badges={{ review: pendingReviews }} projectCount={listProjects().filter((p) => p.status === "active").length} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} pendingReviews={pendingReviews} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
