import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { listProjects, listUsers } from "@/lib/db";
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
  if (getCapabilities(user.role).isReadOnly) redirect("/dashboard");

  const projects = listProjects(user.companyId);
  const people = listUsers(user.companyId).sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Report an incident</h1>
        <p className="mt-1 text-sm text-foreground/60">Near miss, first aid, recordable, property damage, or illness — log it here.</p>
      </div>

      <form action={reportIncidentAction} className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Project</span>
            <select name="projectId" required defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="" disabled>Choose a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.shortName}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Type</span>
            <select name="type" required defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="" disabled>Choose a type…</option>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Level</span>
            <input name="level" placeholder="L3" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Zone</span>
            <input name="zone" placeholder="East" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">What happened</span>
          <textarea
            name="description"
            required
            rows={3}
            placeholder="Describe what happened, as plainly as possible."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Immediate action taken</span>
          <textarea
            name="immediateAction"
            rows={2}
            placeholder="First aid given, area barricaded, work stopped, etc."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">People involved</span>
          <select
            name="involvedUserIds"
            multiple
            className="h-32 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.title}</option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-foreground/45">Ctrl/Cmd-click (or Shift-click) to select more than one.</span>
        </label>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="oshaRecordable" className="h-4 w-4" />
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

        <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
          Report incident
        </button>
      </form>
    </div>
  );
}
