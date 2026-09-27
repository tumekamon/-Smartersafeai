import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { listProjects, listUsers } from "@/lib/db";
import { createPermitAction } from "@/lib/actions/compliance";
import Link from "next/link";

const PERMIT_TYPES = [
  "Hot Work",
  "Confined Space",
  "Excavation",
  "Critical Lift",
  "LOTO",
];

export default async function IssuePermitPage() {
  const user = await getCurrentUser();
  if (user.role === "WORKER" || user.role === "CLIENT_VIEWER") redirect("/compliance");

  const projects = listProjects(user.companyId);
  const people = listUsers(user.companyId).sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/compliance?tab=permits" className="text-xs font-medium text-sidebar-accent">
          ← Back to permits
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Issue permit</h1>
        <p className="mt-1 text-sm text-foreground/60">Authorize high-risk work activities.</p>
      </div>

      <form action={createPermitAction} className="card space-y-4 p-5">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Project</span>
          <select name="projectId" required defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="" disabled>Choose a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.shortName}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Permit type</span>
            <select name="type" required defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="" disabled>Select type…</option>
              {PERMIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Description</span>
            <input name="description" required placeholder="e.g. Welding on structural steel" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Level</span>
            <input name="level" required placeholder="L1" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Zone</span>
            <input name="zone" required placeholder="Zone A" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Starts at</span>
            <input type="datetime-local" name="startsAt" required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Expires at</span>
            <input type="datetime-local" name="expiresAt" required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>
        
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Fire Watch / Attendant (Optional)</span>
          <select name="attendantId" defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">None / Not required</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.title}</option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Issue permit
          </button>
        </div>
      </form>
    </div>
  );
}
