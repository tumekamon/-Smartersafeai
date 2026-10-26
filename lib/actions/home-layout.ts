"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { setAllowPersonalTiles, setRoleLayout } from "@/lib/db";
import { isTileId, MAX_TILES } from "@/lib/dashboard-tiles";
import { MODULES, sectionsCatalogFor, type SectionId } from "@/lib/home-layout";
import { ROLES } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) throw new Error("Only an administrator can change what roles see.");
  return user;
}

export async function saveRoleLayoutAction(formData: FormData) {
  const user = await requireAdmin();
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!ROLES.includes(role)) throw new Error("Not a valid role.");
  const back = `/settings/home?role=${role}`;

  const allowed = new Set(sectionsCatalogFor(role).map((s) => s.id as string));
  const sections = formData.getAll("section").map(String).filter((id) => allowed.has(id)) as SectionId[];
  if (sections.length === 0) redirect(`${back}&error=sections`);

  const tiles = [...new Set(formData.getAll("tile").map(String).filter(isTileId))];
  if (role !== "WORKER" && sections.includes("tiles") && tiles.length === 0) redirect(`${back}&error=tiles`);
  if (tiles.length > MAX_TILES) redirect(`${back}&error=toomany`);

  const modules = Object.fromEntries(MODULES.map((m) => [m.id, role === "ADMIN" || formData.get(`module_${m.id}`) === "on"]));

  setRoleLayout(user.companyId, role, { sections, tiles: role === "WORKER" ? undefined : tiles, modules });
  revalidatePath("/", "layout");
  redirect(`${back}&saved=1`);
}

export async function resetRoleLayoutAction(formData: FormData) {
  const user = await requireAdmin();
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!ROLES.includes(role)) throw new Error("Not a valid role.");
  setRoleLayout(user.companyId, role, {});
  revalidatePath("/", "layout");
  redirect(`/settings/home?role=${role}&saved=1`);
}

export async function setAllowPersonalTilesAction(formData: FormData) {
  const user = await requireAdmin();
  setAllowPersonalTiles(user.companyId, formData.get("allow") === "true");
  revalidatePath("/", "layout");
  redirect(`/settings/home?role=${String(formData.get("role") ?? "ADMIN")}&saved=1`);
}
