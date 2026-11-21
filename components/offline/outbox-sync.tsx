"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { flushOutbox, listOutbox, OUTBOX_EVENT, removeFromOutbox, type OutboxItem } from "@/lib/outbox";
import { IconUpload, IconWifiOff, IconX } from "@/components/ui/icons";

/** Pages a worker may need with no signal; kept on the phone after the first visit. */
const WARM = ["/emergency", "/hazards/new", "/dashboard", "/corrective-actions"];
const PAGES_CACHE = "smartsafe-pages-v1";
const STATIC_CACHE = "smartsafe-static-v1";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/**
 * Runs on every signed-in page. Sends whatever the person saved on their phone while
 * they had no signal (on load, when the connection comes back, when the app is reopened,
 * and every minute), installs the service worker that keeps key pages usable offline,
 * and shows a small bar when there is no signal or something is waiting to send.
 */
export function OutboxSync({ userId }: { userId: string }) {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    listOutbox(userId).then(setItems);
  }, [userId]);

  const flush = useCallback(async () => {
    if (typeof indexedDB === "undefined") return;
    if (!navigator.onLine) return refresh();
    setBusy(true);
    try {
      const { sent } = await flushOutbox(userId);
      if (sent > 0) router.refresh();
    } finally {
      setBusy(false);
      refresh();
    }
  }, [userId, router, refresh]);

  useEffect(() => {
    if (typeof indexedDB === "undefined") return;
    // Deferred so the first paint isn't held up (and state isn't set during the effect).
    const first = setTimeout(flush, 1500);
    const onVisible = () => document.visibilityState === "visible" && flush();
    window.addEventListener(OUTBOX_EVENT, refresh);
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(flush, 60_000);
    return () => {
      clearTimeout(first);
      window.removeEventListener(OUTBOX_EVENT, refresh);
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [flush, refresh]);

  // Service worker (production builds only: in dev it would cache stale code).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const warm = setTimeout(() => warmPages(userId).catch(() => {}), 4000);
    return () => clearTimeout(warm);
  }, [userId]);

  const failed = items.filter((i) => i.error);
  const waiting = items.filter((i) => !i.error);
  if (online && items.length === 0) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 space-y-2 print:hidden md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
    >
      {failed.map((i) => (
        <div key={i.clientId} className="flex items-start gap-3 rounded-2xl border border-status-critical/30 bg-surface p-3 shadow-xl">
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-bold text-status-critical">Couldn&apos;t send: {i.label}</span>
            <span className="block text-foreground/65">{i.error}</span>
          </span>
          <button
            type="button"
            onClick={() => removeFromOutbox(i.clientId)}
            aria-label="Remove it"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <IconX width={16} height={16} />
          </button>
        </div>
      ))}
      {(waiting.length > 0 || !online) && (
        <div className="flex items-center gap-3 rounded-2xl bg-foreground p-3 pl-4 text-background shadow-xl">
          {online ? <IconUpload width={20} height={20} className="shrink-0" /> : <IconWifiOff width={20} height={20} className="shrink-0" />}
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-bold">
              {waiting.length > 0 ? `${waiting.length} waiting to send` : "No signal"}
            </span>
            <span className="block truncate opacity-75">
              {waiting.length === 0
                ? "Reports and fixes you make are saved on your phone."
                : online
                  ? busy
                    ? "Sending…"
                    : waiting.map((i) => i.label).join(", ")
                  : "Saved on your phone. They'll send when you have signal."}
            </span>
          </span>
          {online && waiting.length > 0 && (
            <button type="button" onClick={flush} disabled={busy} className="min-h-10 shrink-0 rounded-xl bg-background px-3 text-sm font-bold text-foreground disabled:opacity-60">
              Send now
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Keeps the pages a worker may need without signal on the phone, along with the
 * scripts and styles they load, so they open (and the forms work) offline.
 */
async function warmPages(userId: string) {
  if (!("caches" in window) || !navigator.onLine) return;
  // Saved pages are one person's: start afresh if someone else used this phone last.
  try {
    if (localStorage.getItem("smartsafe-offline-user") !== userId) {
      await caches.delete(PAGES_CACHE);
      localStorage.setItem("smartsafe-offline-user", userId);
    }
  } catch {}
  const pages = await caches.open(PAGES_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  const queue = [...WARM];
  const seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    const res = await fetch(path, { credentials: "same-origin" });
    if (!res.ok || res.redirected || !(res.headers.get("content-type") ?? "").includes("text/html")) continue;
    const html = await res.clone().text();
    await pages.put(path, res);
    // The worker's own task pages, so a task can be marked fixed with no signal.
    if (path === "/corrective-actions") {
      for (const link of new Set(html.match(/\/corrective-actions\/ca_[\w-]+/g) ?? [])) {
        if (!seen.has(link) && seen.size < WARM.length + 12) {
          seen.add(link);
          queue.push(link);
        }
      }
    }
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
    await Promise.all(
      assets.map(async (a) => {
        if (await statics.match(a)) return;
        await statics.add(a).catch(() => {});
      })
    );
  }
}
