"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { accessibleProject } from "@/lib/scope";
import { SITE_COOKIE } from "@/lib/site-focus";

/**
 * Switch the worker's working site. Only a site they're crewed on and that is active;
 * anything else is ignored. Then go back to where they were (same-app paths only).
 */
export async function switchSiteAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const project = accessibleProject(user, String(formData.get("projectId") ?? ""));
  if (project && project.status === "active") {
    (await cookies()).set(SITE_COOKIE, project.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const back = String(formData.get("redirectTo") ?? "");
  const safe = back.startsWith("/") && !back.startsWith("//") ? back : "/dashboard";
  revalidatePath("/", "layout");
  redirect(safe);
}
