import Link from "next/link";
import { tilesFor, tileValue } from "@/lib/dashboard-tiles";
import { Sparkline } from "@/components/viz/sparkline";
import { IconSettings } from "@/components/ui/icons";

/** The manager's chosen number tiles: big figure, short label, red when an alert tile needs action. */
export function StatTiles({
  companyId,
  projectId,
  saved,
  canEdit,
}: {
  companyId: string;
  projectId?: string;
  saved?: string[];
  canEdit: boolean;
}) {
  const tiles = tilesFor(saved).map((def) => ({ def, v: tileValue(def.id, companyId, projectId) }));

  return (
    <section aria-label="Key numbers" className="space-y-3">
      {canEdit && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Key numbers</h2>
          <Link href="/dashboard/tiles" className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-sidebar-accent hover:bg-surface-muted">
            <IconSettings width={16} height={16} />
            Choose tiles
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {tiles.map(({ def, v }) => {
          const hot = def.alert && v.raw > 0;
          const body = (
            <>
              <span className={`text-4xl font-extrabold leading-none tracking-tight ${hot ? "text-white" : ""}`}>{v.value}</span>
              <span className="mt-auto flex items-end justify-between gap-2">
                <span className={`text-sm font-semibold leading-snug ${hot ? "text-white/90" : "text-foreground/65"}`}>{def.label}</span>
                {v.series && <Sparkline values={v.series} width={72} height={26} />}
              </span>
            </>
          );
          const cls = `flex min-h-28 flex-col gap-3 rounded-2xl p-4 transition-shadow ${
            hot ? "bg-status-critical text-white shadow-lg shadow-status-critical/20" : "card"
          } ${v.href ? "hover:shadow-md" : ""}`;
          return v.href ? (
            <Link key={def.id} href={v.href} className={cls}>{body}</Link>
          ) : (
            <div key={def.id} className={cls}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}
