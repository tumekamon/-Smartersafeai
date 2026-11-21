/*
 * SmartSafe service worker: keeps the app usable on site with poor or no signal.
 *
 * - Scripts, styles and fonts under /_next/static are versioned by the build, so they
 *   are served from the phone once fetched.
 * - A few worker pages (My Day, Emergency, Report a hazard, My tasks and task pages,
 *   My reports) are kept from the last visit. Online, the network always wins; with no
 *   signal the saved copy opens instead, and anything else shows the offline page.
 * - Saved pages are personal, so they are wiped as soon as the login page is visited
 *   (log out, session expired, someone else signing in on the phone).
 *
 * Reports and fixes made offline are not handled here: they wait in the page's outbox
 * (lib/outbox.ts) and are sent when the connection is back.
 */

const PAGES = "smartsafe-pages-v1";
const STATIC = "smartsafe-static-v1";
const OFFLINE_URL = "/offline.html";

const KEEP = [/^\/dashboard$/, /^\/emergency$/, /^\/hazards\/new$/, /^\/corrective-actions(\/[\w-]+)?$/, /^\/my-reports$/, /^\/notifications$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE_URL, "/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("smartsafe-") && k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Any trip to the login page (a full load or the app's own navigation after log out).
  if (url.pathname === "/login") {
    event.waitUntil(caches.delete(PAGES));
    return;
  }

  if (req.mode !== "navigate") return;

  const keep = KEEP.some((re) => re.test(url.pathname));
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.redirected && new URL(res.url).pathname === "/login") {
          caches.delete(PAGES);
        } else if (keep && res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(url.pathname, copy));
        }
        return res;
      })
      .catch(async () => {
        const saved = keep ? await caches.match(url.pathname, { cacheName: PAGES, ignoreVary: true }) : undefined;
        return saved || (await caches.match(OFFLINE_URL)) || new Response("Offline", { status: 503 });
      })
  );
});
