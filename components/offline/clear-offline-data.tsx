"use client";

import { useEffect } from "react";

/**
 * On the login page: wipe the pages the last person kept on this phone for offline use,
 * so nobody signing in next (or picking up a logged-out phone) can open them.
 * Unsent reports stay; they belong to their author and are only sent from their session.
 */
export function ClearOfflineData() {
  useEffect(() => {
    if ("caches" in window) caches.delete("smartsafe-pages-v1").catch(() => {});
  }, []);
  return null;
}
