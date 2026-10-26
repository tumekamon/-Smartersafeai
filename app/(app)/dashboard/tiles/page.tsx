import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { MAX_TILES, TILE_CATALOG, tilesFor } from "@/lib/dashboard-tiles";
import { TilePicker } from "@/components/dashboard/tile-picker";

export default async function DashboardTilesPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canCustomizeDashboard) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs font-medium text-sidebar-accent">
          ← Home
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Choose your tiles</h1>
        <p className="mt-1 text-sm text-foreground/60">Pick the numbers you want to watch on Home.</p>
      </div>
      <TilePicker
        catalog={TILE_CATALOG.map(({ id, label }) => ({ id, label }))}
        selected={tilesFor(user.dashboardTiles).map((t) => t.id)}
        max={MAX_TILES}
      />
    </div>
  );
}
