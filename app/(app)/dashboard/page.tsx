import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject } from "@/lib/db";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { WorkerDashboard } from "@/components/dashboard/worker-dashboard";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user.role);
  const { project: projectId } = await searchParams;

  if (capabilities.isReadOnly) return <ClientDashboard user={user} />;
  if (!capabilities.canViewOrgDashboard) return <WorkerDashboard user={user} />;

  return <ManagerDashboard user={user} project={projectId ? getProject(projectId) : undefined} />;
}
