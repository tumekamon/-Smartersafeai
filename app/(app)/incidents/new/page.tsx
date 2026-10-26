import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany, listUsers } from "@/lib/db";
import { sitesFor } from "@/lib/scope";
import { reportIncidentAction } from "@/lib/actions/incidents";

const TYPES: { value: string; label: string }[] = [
  { value: "near_miss", label: "Near miss" },
  { value: "first_aid", label: "First aid" },
  { value: "recordable", label: "Recordable injury" },
  { value: "property_damage", label: "Property damage" },
  { value: "illness", label: "Illness" },
];

export default async function NewIncidentPage() {
  const user = await getCurrentUser();
  if (getCapabilities(user).isReadOnly) redirect("/dashboard");

  const projects = sitesFor(user);
  const fields = getCompany(user.companyId)?.incidentFields ?? [];
  const people = listUsers(user.companyId).sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Report an incident</h1>
        <p className="mt-1 text-sm text-foreground/60">Near miss, first aid, recordable, property damage, or illness — log it here.</p>
      </div>

      <form action={reportIncidentAction} className="card space-y-5 p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-foreground/80">What kind?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <label key={t.value} className="tap-option">
                <input type="radio" name="type" value={t.value} required className="sr-only" />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold text-foreground/80">Project</span>
            <select name="projectId" required defaultValue={projects.length === 1 ? projects[0].id : ""} className="w-full min-h-12 rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px]">
              <option value="" disabled>Choose a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.shortName}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold text-foreground/80">Level</span>
            <input name="level" placeholder="L3" className="w-full min-h-12 rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-sidebar-accent" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold text-foreground/80">Zone</span>
            <input name="zone" placeholder="East" className="w-full min-h-12 rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-foreground/80">What happened</span>
          <textarea
            name="description"
            required
            rows={3}
            placeholder="Describe what happened, as plainly as possible."
            className="w-full min-h-12 rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-sidebar-accent"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-foreground/80">Immediate action taken</span>
          <textarea
            name="immediateAction"
            rows={2}
            placeholder="First aid given, area barricaded, work stopped, etc."
            className="w-full min-h-12 rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-sidebar-accent"
          />
        </label>

        {fields.map((f) => (
          <fieldset key={f.id}>
            <legend className="mb-2 text-sm font-bold text-foreground/80">
              {f.label}
              {f.required && <span className="ml-1 text-critical">*</span>}
            </legend>
            {f.kind === "text" ? (
              <input
                name={`field_${f.id}`}
                required={f.required}
                maxLength={300}
                aria-label={f.label}
                className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-sidebar-accent"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(f.kind === "yesno" ? ["Yes", "No"] : f.options ?? []).map((o) => (
                  <label key={o} className="tap-option">
                    <input type="radio" name={`field_${f.id}`} value={o} required={f.required} className="sr-only" />
                    {o}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ))}

        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-foreground/80">People involved</span>
          <select
            name="involvedUserIds"
            multiple
            className="h-32 w-full min-h-12 rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px]"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.title}</option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-foreground/45">Ctrl/Cmd-click (or Shift-click) to select more than one.</span>
        </label>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex min-h-12 items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" name="oshaRecordable" className="h-6 w-6" />
            OSHA recordable
          </label>
          <label className="flex items-center gap-2 text-sm">
            Lost time days
            <input
              type="number"
              name="lostTimeDays"
              min={0}
              defaultValue={0}
              className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <button type="submit" className="min-h-16 w-full rounded-2xl bg-sidebar-accent px-4 text-lg font-extrabold text-white">
          Report incident
        </button>
      </form>
    </div>
  );
}
