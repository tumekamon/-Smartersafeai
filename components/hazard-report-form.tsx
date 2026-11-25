"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "@/lib/client-image";
import { newClientId, submitThroughOutbox } from "@/lib/outbox";
import type { Project, RiskLevel } from "@/lib/types";
import { IconCamera, IconImage, IconWifiOff } from "@/components/ui/icons";

const SEVERITY: { value: RiskLevel; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "var(--chart-series-1)" },
  { value: "medium", label: "Medium", color: "var(--status-warning)" },
  { value: "high", label: "High", color: "var(--status-serious)" },
  { value: "critical", label: "Critical", color: "var(--status-critical)" },
];

type Site = Pick<Project, "id" | "shortName" | "levels" | "zones">;

/**
 * Laid out as the design canvas's "Report a hazard" (W04): 01 Photo, 02 Type,
 * 03 How bad, 04 Where, then the yellow Send report pinned to the bottom.
 *
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
  const [editWhere, setEditWhere] = useState(false);

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
      <div className="flex flex-col gap-5">
        <div className="ds-note" role="status">
          <span className="eyebrow flex items-center gap-1.5" style={{ color: "var(--brand)" }}>
            <IconWifiOff width={14} height={14} /> Saved on this phone
          </span>
          <span className="text-[15px] leading-relaxed">
            No signal right now. Your report sends by itself as soon as there is. If it&apos;s dangerous now, tell your supervisor in person or call them.
          </span>
        </div>
        <button type="button" onClick={reset} className="ds-btn ds-btn-primary w-full">
          Report another
        </button>
        <Link href="/emergency" className="ds-btn ds-btn-outline w-full">
          Emergency and who to call
        </Link>
      </div>
    );
  }

  const tile = "flex h-[76px] w-[76px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-foreground/30 bg-surface text-xs font-medium text-body";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[26px]">
      <section className="flex flex-col gap-3">
        <div className="ds-sec">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>01 / Photo</span>
          <span className="eyebrow">{photo ? "1 of 1" : "Optional with a note"}</span>
        </div>
        <div className="flex gap-2">
          {preview && (
            <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="group relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-lg" aria-label="Remove photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Hazard photo" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[11px] font-medium text-white">Remove</span>
            </button>
          )}
          <label htmlFor="hazard-camera" className={tile}>
            {preparing ? (
              <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <IconCamera width={20} height={20} strokeWidth={1.8} />
            )}
            {preview ? "Retake" : "Camera"}
          </label>
          <label htmlFor="hazard-gallery" className={tile}>
            <IconImage width={20} height={20} strokeWidth={1.8} />
            Gallery
          </label>
        </div>
        {[
          { id: "hazard-camera", capture: true },
          { id: "hazard-gallery", capture: false },
        ].map((i) => (
          <input
            key={i.id}
            id={i.id}
            type="file"
            accept="image/*"
            capture={i.capture ? "environment" : undefined}
            className="sr-only"
            onChange={(e) => {
              onPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        ))}
      </section>

      <fieldset className="flex flex-col gap-3">
        <legend className="ds-sec mb-3 w-full">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>02 / Type</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c} className="ds-chip">
              <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" required />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="ds-sec mb-3 w-full">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>03 / How bad</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SEVERITY.map((s) => {
            const on = risk === s.value;
            return (
              <label key={s.value} className="ds-chip" style={on ? { background: s.color, borderColor: s.color, color: "#fff" } : undefined}>
                <input type="radio" name="risk" value={s.value} checked={on} onChange={() => setRisk(s.value)} className="sr-only" required />
                {s.label}
              </label>
            );
          })}
        </div>
        <span className="text-[13px] text-body">Critical alerts your supervisor right away, then goes to review.</span>
      </fieldset>

      <section className="flex flex-col">
        <div className="ds-sec">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>04 / Where</span>
        </div>
        <input type="hidden" name="projectId" value={siteId} />
        <input type="hidden" name="level" value={level} />
        <input type="hidden" name="zone" value={zone} />
        {editWhere ? (
          <div className="flex flex-col gap-2.5 pt-3">
            {sites.length > 1 && (
              <select value={siteId} onChange={(e) => pickSite(e.target.value)} aria-label="Site" className="ds-field">
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.shortName}</option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level" className="ds-field">
                {site?.levels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Zone" className="ds-field">
                {site?.zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setEditWhere(true)} className="flex min-h-[52px] items-center gap-3 border-b border-border text-left text-base font-medium">
            <span className="min-w-0 flex-1 truncate">
              {level} · {zone}
              {sites.length > 1 && <span className="font-normal text-body"> · {site?.shortName}</span>}
            </span>
            <span className="text-sm text-brand">Change</span>
          </button>
        )}
      </section>

      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">
          Anything to add? <span className="font-normal text-body">{photo ? "(optional)" : "(needed without a photo)"}</span>
        </span>
        <input
          type="text"
          name="note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. guardrail missing on stair 2"
          className="ds-field"
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <footer className="ds-foot">
        <button type="submit" disabled={pending || preparing || !category || !risk} className="ds-btn ds-btn-yellow w-full">
          {pending ? "Sending…" : "Send report"}
        </button>
        <span className="ds-foot-hint">No signal? It saves on this phone and sends later.</span>
      </footer>
    </form>
  );
}
