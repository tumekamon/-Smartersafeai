import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createProjectAction } from "@/lib/actions/projects";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) redirect("/dashboard");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New project</h1>
        <p className="mt-1 text-sm text-foreground/60">Starts active, 0% complete, with no crew assigned yet.</p>
      </div>

      <form action={createProjectAction} className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project name" name="name" placeholder="Markey Tower — Electrical" required autoFocus />
          <Field label="Short name" name="shortName" placeholder="Markey" required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project number" name="projectNumber" placeholder="24-118" />
          <Field label="Client" name="client" placeholder="Walsh Construction" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Location" name="location" placeholder="Louisville, KY" />
          <Field label="Start date" name="startDate" type="date" />
        </div>
        <Field label="Headcount" name="headcount" type="number" min={0} placeholder="0" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Levels" name="levels" placeholder="L1, L2, L3, Roof" hint="Comma-separated. Defaults to L1." />
          <Field label="Zones" name="zones" placeholder="North, South, East, West" hint="Comma-separated. Defaults to Zone A." />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  ...props
}: {
  label: string;
  name: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-foreground/80">{label}</span>
      <input
        name={name}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
        {...props}
      />
      {hint && <span className="mt-1 block text-[11px] text-foreground/45">{hint}</span>}
    </label>
  );
}
