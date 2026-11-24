import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createProjectAction } from "@/lib/actions/projects";

const field = "min-h-12 w-full rounded-lg border-[1.5px] border-[rgba(11,31,51,0.2)] bg-surface px-3 text-base";

/** New site (design AP2). Creating it leads straight on to adding its crew. */
export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Link href="/projects" className="inline-flex min-h-11 items-center self-start text-[15px] font-medium text-brand">✕ Cancel</Link>
      <h1 className="disp text-[32px] leading-none">New site</h1>

      <form action={createProjectAction} className="flex flex-col gap-4">
        <Field label="Site name" name="name" placeholder="Louisville Surgical Pavilion" required autoFocus />
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Project no." name="projectNumber" placeholder="BE-2026-027" />
          <Field label="GC / client" name="client" placeholder="Halvorsen" />
        </div>
        <Field label="Short name (optional)" name="shortName" placeholder="Louisville" hint="What crews call it. Defaults to the site name." />
        <Field label="Location" name="location" placeholder="Louisville, KY" />
        <Field label="Levels" name="levels" placeholder="B1, L1, L2, L3, Roof" hint="Separate with commas." />
        <Field label="Zones" name="zones" placeholder="North, South, East, West" hint="Separate with commas." />
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Start date" name="startDate" type="date" />
          <Field label="Headcount" name="headcount" type="number" min={0} placeholder="0" />
        </div>
        <button type="submit" className="mt-2 min-h-[52px] rounded-full bg-brand px-6 text-base font-semibold text-white">
          Create site · next, add crew
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, hint, ...props }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input name={name} className={field} {...props} />
      {hint && <span className="text-[13px] text-body">{hint}</span>}
    </label>
  );
}
