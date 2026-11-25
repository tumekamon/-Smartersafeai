import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { listTemplates } from "@/lib/db";
import { accessibleProject } from "@/lib/scope";
import { InspectionForm } from "@/components/inspection-form";
import { isPlainWorker } from "@/components/nav-items";

export default async function NewInspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ templateId?: string }>;
}) {
  const { projectId } = await params;
  const { templateId } = await searchParams;
  const user = await getCurrentUser();
  // Only sites this person works on; others read as "not found".
  const project = accessibleProject(user, projectId);
  if (!project) notFound();

  if (!getCapabilities(user).canSubmitInspections) {
    redirect(`/projects/${projectId}`);
  }

  // A worker starts checklists from My Day, so that's where back goes (design canvas W05).
  const back = isPlainWorker(user) ? { href: "/dashboard", label: "My Day" } : { href: `/projects/${projectId}`, label: project.shortName };
  return (
    <div className="mx-auto max-w-xl">
      <InspectionForm project={project} templates={listTemplates(user.companyId)} initialTemplateId={templateId} back={back} />
    </div>
  );
}
