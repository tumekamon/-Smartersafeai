import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getOutboxReceipt, getUser, saveOutboxReceipt } from "@/lib/db";
import { fileHazardReport } from "@/lib/hazard-report";
import { completeTask } from "@/lib/task-complete";
import { usesWorkingSite } from "@/lib/site-focus";
import type { User } from "@/lib/types";

/** Items being filed right now, so a resend that arrives mid-way waits its turn instead of filing twice. */
const filing = new Set<string>();

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * The phone's outbox. A hazard report or a "mark fixed" made with no signal is kept on
 * the phone and posted here once it's back online. Same rules as the forms (shared in
 * lib/hazard-report.ts and lib/task-complete.ts). Each item carries a `clientId`, so a
 * resend after a dropped reply never files twice.
 *
 * Replies: 200 filed (or already filed), 422 the report itself is wrong (the phone shows
 * why and drops it), 401 signed out and 409 already being filed (both kept and retried).
 */
export async function POST(req: Request, ctx: RouteContext<"/api/outbox/[kind]">) {
  const { kind } = await ctx.params;
  if (kind !== "hazard" && kind !== "task") return json({ error: "Not found" }, 404);

  // Only from this app's own pages (the session cookie alone isn't proof of that).
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.headers.get("host")) return json({ error: "Forbidden" }, 403);

  const session = await getSession();
  const user = session ? getUser(session.userId) : undefined;
  if (!user || !user.active) return json({ error: "Sign in again to send this." }, 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "That didn't arrive in one piece." }, 400);
  }
  const clientId = String(form.get("clientId") ?? "");
  if (!/^[\w-]{8,64}$/.test(clientId)) return json({ error: "Missing id." }, 400);

  const done = getOutboxReceipt(user.id, clientId);
  if (done) return json({ ok: true, kind: done.kind, ref: done.ref, next: done.next, duplicate: true });
  const key = `${user.id}:${clientId}`;
  if (filing.has(key)) return json({ error: "Already sending." }, 409);
  filing.add(key);
  try {
    return await file(kind, user, clientId, form);
  } finally {
    filing.delete(key);
  }
}

async function file(kind: "hazard" | "task", user: User, clientId: string, form: FormData) {
  if (kind === "hazard") {
    const result = await fileHazardReport(user, form);
    if ("error" in result) return json(result, 422);
    const next = usesWorkingSite(user) ? `/my-reports?sent=${result.findingId}` : `/inspections/${result.inspectionId}?reported=1`;
    saveOutboxReceipt(user.id, clientId, { kind, ref: result.findingId, next });
    revalidatePath("/my-reports");
    return json({ ok: true, kind, ref: result.findingId, next });
  }

  const result = await completeTask(user, form);
  if ("error" in result) return json(result, 422);
  const next = `/corrective-actions/${result.task.id}?done=1`;
  saveOutboxReceipt(user.id, clientId, { kind, ref: result.task.id, next });
  revalidatePath("/corrective-actions");
  revalidatePath(`/corrective-actions/${result.task.id}`);
  revalidatePath("/dashboard");
  return json({ ok: true, kind, ref: result.task.id, next });
}
