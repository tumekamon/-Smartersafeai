import Link from "next/link";
import type { Project } from "@/lib/types";

export function ProjectSwitcher({
  projects,
  selectedId,
  basePath = "/dashboard",
  showAll = true,
}: {
  projects: Project[];
  selectedId?: string;
  basePath?: string;
  showAll?: boolean;
}) {
  const pill = (active: boolean) =>
    `flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${
      active ? "bg-foreground text-background" : "bg-surface text-foreground/65 ring-1 ring-border hover:text-foreground"
    }`;
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {showAll && (
        <Link href={basePath} className={pill(!selectedId)}>
          All sites
        </Link>
      )}
      {projects.map((p) => (
        <Link key={p.id} href={`${basePath}?project=${p.id}`} className={pill(selectedId === p.id)}>
          {p.shortName}
        </Link>
      ))}
    </div>
  );
}
