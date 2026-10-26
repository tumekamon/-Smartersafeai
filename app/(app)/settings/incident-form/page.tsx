import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { addIncidentFieldAction, moveIncidentFieldAction, removeIncidentFieldAction } from "@/lib/actions/incidents";
import { SectionHeader } from "@/components/ui/section-header";
import { IconAlertTriangle, IconPlus, IconTrash } from "@/components/ui/icons";

const KIND_LABEL = { text: "Short answer", choice: "Pick one", yesno: "Yes / No" } as const;

/** The admin adds the company's own questions to the standard incident report (Oct 9 review). */
export default async function IncidentFormSettingsPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) redirect("/dashboard");
  const fields = getCompany(user.companyId)?.incidentFields ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/settings" className="text-xs font-medium text-sidebar-accent">
          ← Settings
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Incident form</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Every report asks type, site, what happened and who was involved. Add your own questions below.
        </p>
      </div>

      <section className="card p-5">
        <SectionHeader Icon={IconAlertTriangle} title="Your questions" tone="warning" />
        {fields.length === 0 ? (
          <p className="text-sm text-foreground/55">No extra questions yet.</p>
        ) : (
          <ol className="space-y-2">
            {fields.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-muted/70 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-sm font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">
                    {f.label}
                    {f.required && <span className="ml-1.5 text-xs font-bold text-critical">required</span>}
                  </p>
                  <p className="text-xs text-foreground/55">
                    {KIND_LABEL[f.kind]}
                    {f.options?.length ? ` · ${f.options.join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(["up", "down"] as const).map((dir) => (
                    <form key={dir} action={moveIncidentFieldAction}>
                      <input type="hidden" name="fieldId" value={f.id} />
                      <input type="hidden" name="dir" value={dir} />
                      <button
                        type="submit"
                        aria-label={`Move ${f.label} ${dir}`}
                        disabled={dir === "up" ? i === 0 : i === fields.length - 1}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-sm font-bold disabled:opacity-30"
                      >
                        {dir === "up" ? "↑" : "↓"}
                      </button>
                    </form>
                  ))}
                  <form action={removeIncidentFieldAction}>
                    <input type="hidden" name="fieldId" value={f.id} />
                    <button type="submit" aria-label={`Remove ${f.label}`} className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-critical">
                      <IconTrash width={16} height={16} />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form action={addIncidentFieldAction} className="card space-y-4 p-5">
        <SectionHeader Icon={IconPlus} title="Add a question" />
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-foreground/80">Question</span>
          <input name="label" required maxLength={120} placeholder="e.g. Was a supervisor present?" className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-sidebar-accent" />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-foreground/80">Answer type</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
              <label key={k} className="tap-option">
                <input type="radio" name="kind" value={k} defaultChecked={k === "text"} className="sr-only" />
                {KIND_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-foreground/80">Options (for Pick one, separated by commas)</span>
          <input name="options" placeholder="Clear, Rain, Wind" className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-sidebar-accent" />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
          <input type="checkbox" name="required" className="h-6 w-6" />
          Required
        </label>
        <button type="submit" className="min-h-12 rounded-xl bg-sidebar-accent px-6 text-[15px] font-bold text-white">
          Add question
        </button>
      </form>
    </div>
  );
}
