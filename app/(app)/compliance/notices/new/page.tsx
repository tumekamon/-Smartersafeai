import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { listProjects } from "@/lib/db";
import { createGcNoticeAction } from "@/lib/actions/compliance";
import Link from "next/link";

export default async function RaiseNoticePage() {
  const user = await getCurrentUser();
  if (user.role === "WORKER" || user.role === "CLIENT_VIEWER") redirect("/compliance");

  const projects = listProjects(user.companyId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/compliance?tab=notices" className="text-xs font-medium text-sidebar-accent">
          ← Back to notices
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Raise GC notice</h1>
        <p className="mt-1 text-sm text-foreground/60">Document a site coordination issue or hazard caused by another trade.</p>
      </div>

      <form action={createGcNoticeAction} className="card space-y-4 p-5">
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
          <span className="mb-1.5 block font-medium text-foreground/80">Trade / Subcontractor involved</span>
          <input name="trade" required placeholder="e.g. Acme Drywall" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Issue description</span>
          <textarea
            name="issue"
            required
            rows={3}
            placeholder="Describe what they did or left behind."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Impact</span>
          <input name="impact" required placeholder="e.g. Blocking our access to the electrical room" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Priority</span>
            <select name="priority" defaultValue="medium" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="low">Low - FYI</option>
              <option value="medium">Medium - Needs fixing soon</option>
              <option value="high">High - Blocking work</option>
              <option value="critical">Critical - Immediate safety hazard</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Raise notice
          </button>
        </div>
      </form>
    </div>
  );
}
