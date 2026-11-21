/**
 * The phone's outbox (browser only). A hazard report or a "mark fixed" is saved here
 * first, then sent. With no signal it stays on the phone and goes out by itself when
 * the connection comes back (components/offline/outbox-sync.tsx), so nothing typed
 * in a basement is lost. Items belong to the person who made them and are only ever
 * sent from their own session.
 */

export type OutboxKind = "hazard" | "task";

export type OutboxItem = {
  clientId: string;
  userId: string;
  kind: OutboxKind;
  /** What the person sees in the "waiting to send" list. */
  label: string;
  createdAt: string;
  fields: Record<string, string>;
  files: { field: string; name: string; blob: Blob }[];
  /** Why the server refused it, if it did (the person decides to drop it). */
  error?: string;
};

export type SendResult =
  | { status: "sent"; ref: string; next?: string }
  | { status: "rejected"; error: string }
  | { status: "offline" }
  | { status: "signed-out" };

export const OUTBOX_EVENT = "smartsafe:outbox";

const DB = "smartsafe-outbox";
const STORE = "items";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "clientId" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

const changed = () => window.dispatchEvent(new Event(OUTBOX_EVENT));

export const newClientId = () =>
  typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export async function saveToOutbox(item: OutboxItem) {
  await tx("readwrite", (s) => s.put(item));
  changed();
}

export async function removeFromOutbox(clientId: string) {
  await tx("readwrite", (s) => s.delete(clientId));
  changed();
}

export async function listOutbox(userId: string): Promise<OutboxItem[]> {
  try {
    const all = await tx<OutboxItem[]>("readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>);
    return all.filter((i) => i.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

/** Posts one item. Network trouble and server hiccups keep it queued; a refusal doesn't. */
const inFlight = new Set<string>();

export async function sendOutboxItem(item: OutboxItem): Promise<SendResult> {
  if (!navigator.onLine) return { status: "offline" };
  // The form and the background sync may reach the same item at once; one send is enough.
  if (inFlight.has(item.clientId)) return { status: "offline" };
  inFlight.add(item.clientId);
  try {
    return await post(item);
  } finally {
    inFlight.delete(item.clientId);
  }
}

async function post(item: OutboxItem): Promise<SendResult> {
  const fd = new FormData();
  fd.set("clientId", item.clientId);
  for (const [k, v] of Object.entries(item.fields)) fd.set(k, v);
  for (const f of item.files) fd.append(f.field, f.blob, f.name);

  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45_000);
    res = await fetch(`/api/outbox/${item.kind}`, { method: "POST", body: fd, credentials: "same-origin", signal: ctrl.signal });
    clearTimeout(timer);
  } catch {
    return { status: "offline" };
  }
  const body = (await res.json().catch(() => ({}))) as { ref?: string; next?: string; error?: string };
  if (res.ok && body.ref) return { status: "sent", ref: body.ref, next: body.next };
  if (res.status === 401) return { status: "signed-out" };
  if (res.status === 422 || res.status === 400 || res.status === 404) return { status: "rejected", error: body.error ?? "It couldn't be sent." };
  return { status: "offline" };
}

/**
 * Save first, then try to send. A sent item leaves the outbox; a refused one leaves it
 * too (the form shows why); anything else stays for the background sync.
 */
export async function submitThroughOutbox(item: OutboxItem): Promise<SendResult> {
  await saveToOutbox(item);
  const result = await sendOutboxItem(item);
  if (result.status === "sent" || result.status === "rejected") await removeFromOutbox(item.clientId);
  return result;
}

/** Sends whatever is waiting for this person. Refused items stay, marked with the reason. */
export async function flushOutbox(userId: string): Promise<{ sent: number }> {
  let sent = 0;
  for (const item of await listOutbox(userId)) {
    if (item.error) continue;
    const result = await sendOutboxItem(item);
    if (result.status === "sent") {
      await removeFromOutbox(item.clientId);
      sent++;
    } else if (result.status === "rejected") {
      await saveToOutbox({ ...item, error: result.error });
    } else break; // still offline or signed out: try again later
  }
  return { sent };
}
