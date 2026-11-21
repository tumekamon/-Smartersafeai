"use client";

import { useEffect } from "react";
import { markNotificationsSeenAction } from "@/lib/actions/notifications";

export const INBOX_SEEN_EVENT = "smartsafe:inbox-seen";

/**
 * Opening the list marks it read. The bell hears about it at once; the list itself
 * keeps showing what was new until the person leaves the page.
 */
export function MarkSeen() {
  useEffect(() => {
    markNotificationsSeenAction()
      .then(() => window.dispatchEvent(new Event(INBOX_SEEN_EVENT)))
      .catch(() => {});
  }, []);
  return null;
}
