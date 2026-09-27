import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject, listTemplates } from "@/lib/db";
import { InspectionForm } from "@/components/inspection-form";

export default async function NewInspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ templateId?: string }>;
}) {
  const { projectId } = await params;
  const { templateId } = await searchParams;
  const project = getProject(projectId);
  if (!project) notFound();

  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canSubmitInspections) {
    redirect(`/projects/${projectId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-xs font-medium text-sidebar-accent">
          ← {project.shortName}
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">New inspection</h1>
        <p className="mt-1 text-sm text-foreground/60">{project.name}</p>
      </div>
      <InspectionForm project={project} templates={listTemplates(user.companyId)} initialTemplateId={templateId} />
    </div>
  );
}
