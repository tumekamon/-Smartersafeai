import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { listProjects } from "@/lib/db";
import { createAssetAction } from "@/lib/actions/compliance";
import Link from "next/link";

export default async function AddAssetPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) redirect("/compliance");

  const projects = listProjects(user.companyId);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/compliance?tab=equipment" className="text-xs font-medium text-sidebar-accent">
          ← Back to equipment
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Add asset</h1>
        <p className="mt-1 text-sm text-foreground/60">Register new equipment to track inspections and pass rates.</p>
      </div>

      <form action={createAssetAction} className="card space-y-4 p-5">
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
            <span className="mb-1.5 block font-medium text-foreground/80">Asset tag</span>
            <input name="tag" required placeholder="LIFT-001" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent uppercase" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Equipment name</span>
            <input name="name" required placeholder="JLG 450AJ Articulating Boom" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Category</span>
          <select name="category" defaultValue="Lifting Equipment" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="Lifting Equipment">Lifting Equipment</option>
            <option value="Earthmoving Equipment">Earthmoving Equipment</option>
            <option value="Power Tools">Power Tools</option>
            <option value="Vehicles">Vehicles</option>
          </select>
        </label>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Register asset
          </button>
        </div>
      </form>
    </div>
  );
}
