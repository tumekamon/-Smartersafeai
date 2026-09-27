import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany, listTemplates } from "@/lib/db";
import { BrandingForm } from "@/components/settings/branding-form";
import { CategoryManager } from "@/components/settings/category-manager";
import { NewTemplateForm } from "@/components/settings/new-template-form";
import { IconArrowRight, IconSparkle } from "@/components/ui/icons";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) redirect("/dashboard");

  const company = getCompany(user.companyId);
  if (!company) redirect("/dashboard");

  const templates = listTemplates(user.companyId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Branding</h2>
        <BrandingForm name={company.name} primaryColor={company.primaryColor} />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Hazard categories</h2>
        <CategoryManager categories={company.hazardCategories} />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Inspection templates</h2>
        <ul className="mb-4 divide-y divide-border">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/settings/templates/${t.id}`}
                className="group flex items-center gap-3 py-3 transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-foreground/50">
                    <span>{t.checklist.length} items</span>
                    <span>· Photos {t.evidenceRequirement}</span>
                    {t.aiAnalysisEnabled && (
                      <span className="ai-chip">
                        <IconSparkle width={10} height={10} />
                        AI review
                      </span>
                    )}
                  </p>
                </div>
                <IconArrowRight width={14} height={14} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
        <NewTemplateForm />
      </section>
    </div>
  );
}
