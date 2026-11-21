"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconBell } from "@/components/ui/icons";
import { INBOX_SEEN_EVENT } from "@/components/notifications/mark-seen";

/** The top-bar bell: how many notifications came in since the worker last looked. */
export function NotificationBell({ unread }: { unread: number }) {
  // Cleared when the list is opened, until the server sends a newer count.
  const [cleared, setCleared] = useState(false);
  const [lastUnread, setLastUnread] = useState(unread);
  if (unread !== lastUnread) {
    setLastUnread(unread);
    setCleared(false);
  }
  const pathname = usePathname();
  useEffect(() => {
    const clear = () => setCleared(true);
    window.addEventListener(INBOX_SEEN_EVENT, clear);
    return () => window.removeEventListener(INBOX_SEEN_EVENT, clear);
  }, []);
  const shown = cleared || pathname === "/notifications" ? 0 : unread;

  return (
    <Link
      href="/notifications"
      aria-label={shown ? `Notifications, ${shown} new` : "Notifications"}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface/50 text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      <IconBell width={19} height={19} />
      {shown > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-status-critical px-1 text-[11px] font-black tabular-nums leading-none text-white ring-2 ring-surface">
          {shown > 9 ? "9+" : shown}
        </span>
      )}
    </Link>
  );
}
