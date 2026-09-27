import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject } from "@/lib/db";
import { updateProjectAction } from "@/lib/actions/projects";
import Link from "next/link";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) redirect("/dashboard");

  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-xs font-medium text-sidebar-accent">
          ← Back to project
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Edit project</h1>
        <p className="mt-1 text-sm text-foreground/60">{project.name}</p>
      </div>

      <form action={updateProjectAction} className="card space-y-4 p-5">
        <input type="hidden" name="projectId" value={project.id} />
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project name" name="name" defaultValue={project.name} required autoFocus />
          <Field label="Short name" name="shortName" defaultValue={project.shortName} required />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Status</span>
            <select name="status" defaultValue={project.status} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <Field label="Percent complete" name="percentComplete" type="number" min={0} max={100} defaultValue={project.percentComplete} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client" name="client" defaultValue={project.client} />
          <Field label="Location" name="location" defaultValue={project.location} />
        </div>
        
        <Field label="Headcount" name="headcount" type="number" min={0} defaultValue={project.headcount} />
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60">
          <Field label="Project number" name="projectNumber" defaultValue={project.projectNumber} readOnly hint="Cannot be changed" />
          <Field label="Start date" name="startDate" defaultValue={project.startDate} type="date" readOnly hint="Cannot be changed" />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Save changes
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
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent disabled:opacity-50"
        {...props}
      />
      {hint && <span className="mt-1 block text-[11px] text-foreground/45">{hint}</span>}
    </label>
  );
}
