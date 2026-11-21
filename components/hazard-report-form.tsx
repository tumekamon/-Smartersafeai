"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "@/lib/client-image";
import { newClientId, submitThroughOutbox } from "@/lib/outbox";
import type { Project, RiskLevel } from "@/lib/types";
import { IconArrowRight, IconCamera, IconCheck, IconMapPin, IconWifiOff } from "@/components/ui/icons";

const SEVERITY: { value: RiskLevel; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "var(--chart-series-1)" },
  { value: "medium", label: "Medium", color: "var(--status-warning)" },
  { value: "high", label: "High", color: "var(--status-serious)" },
  { value: "critical", label: "Critical", color: "var(--status-critical)" },
];

type Site = Pick<Project, "id" | "shortName" | "levels" | "zones">;

/**
 * Photo first, then three taps: what, how bad, where. Built for one hand and gloves.
 * The report is saved on the phone before it's sent, so with no signal it waits in the
 * outbox and goes out by itself later (lib/outbox.ts).
 */
export function HazardReportForm({ sites, categories, initialSiteId, userId }: { sites: Site[]; categories: string[]; initialSiteId?: string; userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [note, setNote] = useState("");
  const [siteId, setSiteId] = useState(initialSiteId ?? sites[0]?.id ?? "");
  const site = sites.find((s) => s.id === siteId) ?? sites[0];
  const [level, setLevel] = useState(site?.levels[0] ?? "");
  const [zone, setZone] = useState(site?.zones[0] ?? "");
  const [category, setCategory] = useState("");
  const [risk, setRisk] = useState<RiskLevel | "">("");
  const [preview, setPreview] = useState<string | null>(null);

  const pickSite = (id: string) => {
    const next = sites.find((s) => s.id === id);
    setSiteId(id);
    setLevel(next?.levels[0] ?? "");
    setZone(next?.zones[0] ?? "");
  };

  const reset = () => {
    setQueued(false);
    setCategory("");
    setRisk("");
    setPhoto(null);
    setPreview(null);
    setNote("");
    setError(null);
  };

  const onPhoto = (file?: File) => {
    if (!file) return;
    setPreparing(true);
    setError(null);
    toJpeg(file, { maxEdge: 1600, name: "hazard.jpg" })
      .then((jpeg) => {
        setPhoto(jpeg);
        setPreview(URL.createObjectURL(jpeg));
      })
      .catch(() => setError("That photo can't be read. Try again with the camera."))
      .finally(() => setPreparing(false));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo && !note.trim()) return setError("Add a photo or say what you saw.");
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const fields: Record<string, string> = { seenAt: new Date().toISOString() };
    for (const k of ["projectId", "level", "zone", "category", "risk", "note"]) fields[k] = String(fd.get(k) ?? "");
    try {
      const result = await submitThroughOutbox({
        clientId: newClientId(),
        userId,
        kind: "hazard",
        label: `${category} hazard report`,
        createdAt: new Date().toISOString(),
        fields,
        files: photo ? [{ field: "evidence", name: "hazard.jpg", blob: photo }] : [],
      });
      if (result.status === "sent") return router.push(result.next ?? "/my-reports");
      if (result.status === "rejected") setError(result.error);
      else setQueued(true);
    } catch {
      setError("This phone couldn't save the report. Check your signal and try again.");
    } finally {
      setPending(false);
    }
  };

  if (queued) {
    return (
      <div className="card space-y-4 p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-warning/15 text-status-warning">
          <IconWifiOff width={26} height={26} />
        </span>
        <div>
          <p className="text-lg font-bold">Saved on your phone</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/65">
            There&apos;s no signal right now. Your report will send by itself as soon as there is. If the hazard is dangerous now, tell your supervisor in person or call them.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={reset} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-bold text-background">
            <IconCheck width={18} height={18} strokeWidth={2.4} /> Report another
          </button>
          <Link href="/emergency" className="flex min-h-12 items-center justify-center rounded-xl bg-surface text-[15px] font-bold ring-1 ring-border">
            Call my supervisor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label
        htmlFor="hazard-photo"
        className="relative flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-[#2b3340] text-white"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Hazard photo" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
              <IconCamera width={38} height={38} strokeWidth={1.8} />
            </span>
            <span className="text-lg font-bold">{preparing ? "Preparing photo…" : "Take a photo"}</span>
          </>
        )}
        {preview && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold">Retake</span>
        )}
      </label>
      <input
        id="hazard-photo"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          onPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-foreground/70">What is it?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {categories.map((c) => (
            <TapOption key={c} name="category" value={c} checked={category === c} onChange={() => setCategory(c)}>
              {c}
            </TapOption>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-foreground/70">How serious?</legend>
        <div className="grid grid-cols-4 gap-2">
          {SEVERITY.map((s) => {
            const on = risk === s.value;
            return (
              <label
                key={s.value}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 text-sm font-bold transition-colors"
                style={{ background: on ? s.color : "var(--surface)", color: on ? "#fff" : "var(--foreground)", borderColor: on ? s.color : "var(--border)" }}
              >
                <input type="radio" name="risk" value={s.value} checked={on} onChange={() => setRisk(s.value)} className="sr-only" required />
                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: on ? "#fff" : s.color }} />
                {s.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="card space-y-3 p-4">
        <legend className="sr-only">Where</legend>
        <p className="flex items-center gap-2 text-sm font-bold text-foreground/70">
          <IconMapPin width={18} height={18} />
          Where?
        </p>
        {sites.length > 1 && (
          <select
            name="projectId"
            value={siteId}
            onChange={(e) => pickSite(e.target.value)}
            aria-label="Site"
            className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px] font-semibold"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.shortName}</option>
            ))}
          </select>
        )}
        {sites.length === 1 && <input type="hidden" name="projectId" value={siteId} />}
        <div className="grid grid-cols-2 gap-2">
          <select name="level" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level" className="min-h-12 rounded-xl border border-border bg-surface px-3 text-[15px] font-semibold">
            {site?.levels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select name="zone" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Zone" className="min-h-12 rounded-xl border border-border bg-surface px-3 text-[15px] font-semibold">
            {site?.zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-foreground/70">Anything to add? (optional)</span>
        <input
          type="text"
          name="note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. guardrail missing on stair 2"
          className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-sidebar-accent"
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button
        type="submit"
        disabled={pending || preparing || !category || !risk}
        className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-lg font-extrabold text-background disabled:opacity-40"
      >
        {pending ? "Sending…" : "Send report"}
        {!pending && <IconArrowRight width={22} height={22} strokeWidth={2.4} />}
      </button>
    </form>
  );
}

function TapOption({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center justify-center rounded-2xl px-2 text-center text-[15px] font-bold ring-1 transition-colors ${
        checked ? "bg-foreground text-background ring-foreground" : "bg-surface ring-border hover:bg-surface-muted"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" required />
      {children}
    </label>
  );
}
