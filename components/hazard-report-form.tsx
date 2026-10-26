"use client";

import { useActionState, useState } from "react";
import { submitHazardReport } from "@/lib/actions/hazards";
import type { Project, RiskLevel } from "@/lib/types";
import { IconArrowRight, IconCamera, IconMapPin } from "@/components/ui/icons";

const SEVERITY: { value: RiskLevel; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "var(--chart-series-1)" },
  { value: "medium", label: "Medium", color: "var(--status-warning)" },
  { value: "high", label: "High", color: "var(--status-serious)" },
  { value: "critical", label: "Critical", color: "var(--status-critical)" },
];

type Site = Pick<Project, "id" | "shortName" | "levels" | "zones">;

/** Photo first, then three taps: what, how bad, where. Built for one hand and gloves. */
export function HazardReportForm({ sites, categories, initialSiteId }: { sites: Site[]; categories: string[]; initialSiteId?: string }) {
  const [state, action, pending] = useActionState(submitHazardReport, undefined);
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

  return (
    <form action={action} className="space-y-5">
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
            <span className="text-lg font-bold">Take a photo</span>
          </>
        )}
        {preview && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold">Retake</span>
        )}
      </label>
      <input
        id="hazard-photo"
        type="file"
        name="evidence"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
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
          placeholder="e.g. guardrail missing on stair 2"
          className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px] outline-none focus:border-sidebar-accent"
        />
      </label>

      {state?.error && <p className="form-error">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !category || !risk}
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
