import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/db";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = getUser(session.userId);
  // A deactivated account loses access at once, even with a session still open.
  if (!user || !user.active) {
    redirect("/login");
  }
  return user;
});
