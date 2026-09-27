import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany, getTemplate } from "@/lib/db";
import { TemplateMetaForm } from "@/components/settings/template-meta-form";
import { ChecklistItemRow } from "@/components/settings/checklist-item-row";
import { AddChecklistItemForm } from "@/components/settings/add-checklist-item-form";

export default async function TemplateSettingsPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) redirect("/dashboard");

  const { templateId } = await params;
  const template = getTemplate(templateId);
  if (!template || template.companyId !== user.companyId) notFound();

  const company = getCompany(user.companyId);
  const categories = company?.hazardCategories ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/settings" className="text-xs font-medium text-sidebar-accent">
          ← Settings
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">{template.name}</h1>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Template</h2>
        <TemplateMetaForm template={template} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Checklist</h2>
        {template.checklist.length === 0 ? (
          <p className="py-3 text-sm text-foreground/50">No checklist items yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {template.checklist.map((item) => (
              <ChecklistItemRow key={item.id} templateId={template.id} item={item} categories={categories} />
            ))}
          </ul>
        )}
        <AddChecklistItemForm templateId={template.id} categories={categories} />
      </section>
    </div>
  );
}
