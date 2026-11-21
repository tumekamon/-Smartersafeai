import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCertification } from "@/lib/db";
import { peopleFor } from "@/lib/scope";

/**
 * Serves a certificate's photo or PDF. Only its owner, or a reviewer whose sites the
 * owner works on, can open it; anyone else gets a plain 404 so no ids leak.
 */
export async function GET(_req: Request, ctx: RouteContext<"/certificates/[certId]/file">) {
  const { certId } = await ctx.params;
  const user = await getCurrentUser();
  const cert = getCertification(certId);
  const doc = cert?.document;

  const caps = getCapabilities(user);
  const allowed =
    !!cert &&
    (cert.userId === user.id ||
      ((caps.canReviewCheckIns || caps.canManageCompliance) && peopleFor(user).some((p) => p.id === cert.userId)));
  if (!allowed || !doc?.dataUrl) return new Response("Not found", { status: 404 });

  const body = Buffer.from(doc.dataUrl.slice(doc.dataUrl.indexOf(",") + 1), "base64");
  return new Response(body, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
