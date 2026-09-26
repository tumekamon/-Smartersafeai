import Link from "next/link";
import type { Project } from "@/lib/types";

export function ProjectSwitcher({
  projects,
  selectedId,
  basePath = "/dashboard",
}: {
  projects: Project[];
  selectedId?: string;
  basePath?: string;
}) {
  const pill = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
      active ? "bg-foreground text-background" : "bg-surface text-foreground/65 ring-1 ring-border hover:text-foreground"
    }`;
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={basePath} className={pill(!selectedId)}>
        All sites
      </Link>
      {projects.map((p) => (
        <Link key={p.id} href={`${basePath}?project=${p.id}`} className={pill(selectedId === p.id)}>
          {p.shortName}
        </Link>
      ))}
    </div>
  );
}
