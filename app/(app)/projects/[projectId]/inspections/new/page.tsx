import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject, listTemplates } from "@/lib/db";
import { InspectionForm } from "@/components/inspection-form";
import { Card } from "@/components/ui/card";

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

  const templates = listTemplates();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium text-foreground/50">{project.name}</p>
        <h1 className="text-xl font-semibold">New Inspection</h1>
      </div>
      <Card>
        <InspectionForm projectId={projectId} templates={templates} initialTemplateId={templateId} />
      </Card>
    </div>
  );
}
