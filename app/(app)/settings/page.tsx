import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany, listTemplates, listUsers } from "@/lib/db";
import { BrandingForm } from "@/components/settings/branding-form";
import { CategoryManager } from "@/components/settings/category-manager";
import { NewTemplateForm } from "@/components/settings/new-template-form";
import { IconAlertTriangle, IconArrowRight, IconClipboardCheck, IconGrid, IconSparkle, IconUser, IconUsers } from "@/components/ui/icons";
import { SectionHeader } from "@/components/ui/section-header";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  const canManage = caps.canManageSettings;
  const canEditTemplates = caps.canManageTemplates;

  const company = getCompany(user.companyId);
  if (!company) redirect("/dashboard");

  const templates = canEditTemplates ? listTemplates(user.companyId) : [];
  const memberCount = canManage ? listUsers(user.companyId).length : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      {canManage && (
        <section className="card p-5">
          <SectionHeader Icon={IconSparkle} title="Branding" />
          <BrandingForm name={company.name} primaryColor={company.primaryColor} heroImage={company.heroImage} />
        </section>
      )}

      {canManage && (
        <Link
          href="/settings/home"
          className="card group flex items-center gap-3 p-5 transition-colors hover:bg-surface-muted"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand">
            <IconGrid width={20} height={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">What each role sees</p>
            <p className="text-xs text-foreground/50">Home sections, number tiles and menu areas per role level</p>
          </div>
          <IconArrowRight width={14} height={14} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {canManage && (
        <Link
          href="/settings/incident-form"
          className="card group flex items-center gap-3 p-5 transition-colors hover:bg-surface-muted"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand">
            <IconAlertTriangle width={20} height={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">Incident form</p>
            <p className="text-xs text-foreground/50">Add your own questions to every incident report</p>
          </div>
          <IconArrowRight width={14} height={14} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {canManage && (
        <Link
          href="/settings/team"
          className="card group flex items-center gap-3 p-5 transition-colors hover:bg-surface-muted"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand">
            <IconUsers width={20} height={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">Team</p>
            <p className="text-xs text-foreground/50">{memberCount} people · invite, change roles, deactivate</p>
          </div>
          <IconArrowRight width={14} height={14} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      <Link
        href="/settings/profile"
        className="card group flex items-center gap-3 p-5 transition-colors hover:bg-surface-muted"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand">
          <IconUser width={20} height={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">Your Profile</p>
          <p className="text-xs text-foreground/50">Update your name, title, and personal details</p>
        </div>
        <IconArrowRight width={14} height={14} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
      </Link>

      {canManage && (
        <section className="card p-5">
          <SectionHeader Icon={IconAlertTriangle} title="Hazard categories" tone="warning" />
          <CategoryManager categories={company.hazardCategories} />
        </section>
      )}

      {canEditTemplates && (
        <>
          <section id="templates" className="card p-5">
            <SectionHeader Icon={IconClipboardCheck} title="Inspection templates" />
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
        </>
      )}
    </div>
  );
}
