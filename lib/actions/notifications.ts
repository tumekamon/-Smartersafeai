"use server";

import { getCurrentUser } from "@/lib/dal";
import { setInboxSeen } from "@/lib/db";

/** The person opened their notifications: everything up to now counts as read. */
export async function markNotificationsSeenAction() {
  const user = await getCurrentUser();
  setInboxSeen(user.id, new Date().toISOString());
}
