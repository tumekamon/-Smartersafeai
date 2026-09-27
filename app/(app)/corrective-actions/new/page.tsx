import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { listProjects, listUsers } from "@/lib/db";
import { createCorrectiveActionAction } from "@/lib/actions/corrective-actions";

export default async function NewCorrectiveActionPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canCreateCorrectiveActions) redirect("/dashboard");

  const projects = listProjects(user.companyId);
  const people = listUsers(user.companyId).sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create corrective action</h1>
        <p className="mt-1 text-sm text-foreground/60">Manually assign a task to remediate an issue.</p>
      </div>

      <form action={createCorrectiveActionAction} className="card space-y-4 p-5">
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
          <span className="mb-1.5 block font-medium text-foreground/80">Description</span>
          <textarea
            name="description"
            required
            rows={3}
            placeholder="What needs to be fixed?"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Assign to</span>
            <select name="assignedToId" required defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="" disabled>Choose a team member…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Due date</span>
            <input type="date" name="dueDate" required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
          Create action
        </button>
      </form>
    </div>
  );
}
