"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { saveDailyReport } from "@/lib/db";
import { accessibleProject } from "@/lib/scope";
import { checkInDay } from "@/lib/check-in";
import { dailySnapshot } from "@/lib/daily-report";

/** The supervisor sends the 08:00 report for a site they run (design S05). */
export async function submitDailyReport(formData: FormData) {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  if (caps.isReadOnly || !caps.canVerifyActions) throw new Error("Only supervisors send the daily site report.");

  const project = accessibleProject(user, String(formData.get("projectId") ?? ""));
  if (!project) throw new Error("Site not found.");

  const highRiskWork = String(formData.get("highRiskWork") ?? "").trim().slice(0, 500);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!highRiskWork) throw new Error("Say what high-risk work is planned today, or \"none\".");

  const now = Date.now();
  saveDailyReport({
    companyId: user.companyId,
    projectId: project.id,
    supervisorId: user.id,
    day: checkInDay(now),
    submittedAt: new Date(now).toISOString(),
    highRiskWork,
    note: note || undefined,
    snapshot: dailySnapshot(project, now),
  });

  revalidatePath("/dashboard");
  revalidatePath("/daily-reports");
  redirect("/dashboard?reportSent=1");
}
