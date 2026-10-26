"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { updateUser } from "@/lib/db";
import { isTileId, MAX_TILES } from "@/lib/dashboard-tiles";

export async function saveDashboardTilesAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canCustomizeDashboard) throw new Error("You can't customize this dashboard.");

  if (formData.get("reset") === "1") {
    updateUser(user.id, { dashboardTiles: [] });
  } else {
    const ids = formData.getAll("tile").map(String).filter(isTileId);
    if (ids.length === 0) throw new Error("Pick at least one tile.");
    if (ids.length > MAX_TILES) throw new Error(`Pick up to ${MAX_TILES} tiles.`);
    updateUser(user.id, { dashboardTiles: [...new Set(ids)] });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
