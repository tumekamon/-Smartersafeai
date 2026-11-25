"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitInspection } from "@/lib/actions/inspections";
import type { ChecklistResponseValue, InspectionTemplate, Project } from "@/lib/types";
import { IconCamera, IconChevronLeft, IconSparkle } from "@/components/ui/icons";

const OPTIONS: { value: ChecklistResponseValue; label: string; on: string }[] = [
  { value: "pass", label: "Pass", on: "var(--status-good)" },
  { value: "fail", label: "Fail", on: "var(--status-critical)" },
  { value: "na", label: "N/A", on: "var(--status-neutral)" },
];

/**
 * Run a checklist (design canvas W05): the checklist's name, how far through you are,
 * one question at a time with Pass / Fail / N/A, and "Finish and sign" at the bottom.
 * Every item must be answered: nothing is assumed to pass. A fail asks what's wrong;
 * it becomes a finding.
 */
export function InspectionForm({
  project,
  templates,
  initialTemplateId,
  back,
}: {
  project: Project;
  templates: InspectionTemplate[];
  initialTemplateId?: string;
  back: { href: string; label: string };
}) {
  const preset = templates.some((t) => t.id === initialTemplateId);
  const [templateId, setTemplateId] = useState(preset ? initialTemplateId! : (templates[0]?.id ?? ""));
  const [level, setLevel] = useState(project.levels[Math.min(2, project.levels.length - 1)]);
  const [zone, setZone] = useState(project.zones[0]);
  const [editWhere, setEditWhere] = useState(false);
  const [answers, setAnswers] = useState<Record<string, ChecklistResponseValue>>({});
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const [state, action, pending] = useActionState(submitInspection, undefined);
  const template = templates.find((t) => t.id === templateId);

  const answerFor = (id: string) => answers[`${templateId}:${id}`];
  const total = template?.checklist.length ?? 0;
  const answered = template ? template.checklist.filter((i) => answerFor(i.id)).length : 0;
  const failCount = template ? template.checklist.filter((i) => answerFor(i.id) === "fail").length : 0;

  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="zone" value={zone} />

      <header className="flex flex-col gap-3">
        <Link href={back.href} className="ds-back self-start">
          <IconChevronLeft width={18} height={18} /> {back.label}
        </Link>
        <span className="eyebrow">
          {project.shortName} · {answered} of {total} done
        </span>
        <h1 className="disp text-[34px] leading-none">{preset && template ? template.name : "Run a checklist"}</h1>
        {template?.aiAnalysisEnabled && (
          <span className="ai-chip self-start">
            <IconSparkle width={11} height={11} /> Photos get an AI check
          </span>
        )}
        <div className="h-1 rounded-sm bg-tint" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
          <div className="h-1 rounded-sm bg-brand transition-all" style={{ width: total ? `${(answered / total) * 100}%` : 0 }} />
        </div>
      </header>

      {!preset && (
        <section className="flex flex-col gap-3">
          <div className="ds-sec">
            <span className="eyebrow" style={{ color: "var(--foreground)" }}>Checklist</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} aria-pressed={t.id === templateId} className="ds-chip">
                {t.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col">
        <div className="ds-sec">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>Where</span>
        </div>
        {editWhere ? (
          <div className="flex flex-col gap-3 pt-3">
            {[
              { label: "Level", list: project.levels, value: level, set: setLevel },
              { label: "Zone", list: project.zones, value: zone, set: setZone },
            ].map((g) => (
              <div key={g.label} className="flex flex-wrap items-center gap-2">
                <span className="w-full text-sm text-body">{g.label}</span>
                {g.list.map((v) => (
                  <button key={v} type="button" onClick={() => g.set(v)} aria-pressed={g.value === v} className="ds-chip">
                    {v}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => setEditWhere(true)} className="flex min-h-[52px] items-center gap-3 border-b border-border text-left text-base font-medium">
            <span className="flex-1">
              {level} · {zone}
            </span>
            <span className="text-sm text-brand">Change</span>
          </button>
        )}
      </section>

      {template && (
        <ol className="flex flex-col">
          {template.checklist.map((item, n) => {
            const value = answerFor(item.id);
            return (
              <li key={`${template.id}-${item.id}`} className="flex flex-col gap-2.5 border-b border-border py-4 last:border-b-0">
                <span id={`q_${item.id}`} className="text-base font-medium">
                  {n + 1}. {item.label}
                </span>
                <div role="radiogroup" aria-labelledby={`q_${item.id}`} className="grid grid-cols-3 gap-1.5">
                  {OPTIONS.map((o) => {
                    const on = value === o.value;
                    return (
                      <label
                        key={o.value}
                        className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] text-sm font-medium has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand"
                        style={
                          on
                            ? { background: o.on, borderColor: o.on, color: "#fff" }
                            : { background: "var(--surface)", borderColor: "color-mix(in srgb, var(--foreground) 20%, transparent)" }
                        }
                      >
                        <input
                          type="radio"
                          name={`response_${item.id}`}
                          value={o.value}
                          checked={on}
                          required
                          onChange={() => setAnswers((a) => ({ ...a, [`${template.id}:${item.id}`]: o.value }))}
                          className="sr-only"
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                {value === "fail" && (
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium tone-critical">What&apos;s wrong? This becomes a finding for safety to act on.</span>
                    <input type="text" name={`note_${item.id}`} required className="ds-field" style={{ borderColor: "var(--status-critical)" }} />
                  </label>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {template && template.evidenceRequirement !== "disabled" && (
        <section className="flex flex-col gap-3">
          <div className="ds-sec">
            <span className="eyebrow" style={{ color: "var(--foreground)" }}>Photos</span>
            <span className="eyebrow">{template.evidenceRequirement === "required" ? "Required" : "Optional"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {previews.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.url} src={p.url} alt={p.name} className="h-[76px] w-[76px] rounded-lg object-cover" />
            ))}
            <label
              htmlFor="evidence"
              className="flex h-[76px] w-[76px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-foreground/30 bg-surface text-xs font-medium text-body"
            >
              <IconCamera width={20} height={20} strokeWidth={1.8} />
              {previews.length ? "Retake" : "Camera"}
            </label>
          </div>
          <input
            id="evidence"
            type="file"
            name="evidence"
            accept="image/*"
            capture="environment"
            multiple
            required={template.evidenceRequirement === "required"}
            className="sr-only"
            onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f) })))}
          />
        </section>
      )}

      {state?.error && <p className="form-error">{state.error}</p>}

      <footer className="ds-foot">
        <button type="submit" disabled={pending || !template} className="ds-btn ds-btn-primary w-full">
          {pending ? "Sending…" : failCount > 0 ? `Finish and sign · ${failCount} ${failCount === 1 ? "finding" : "findings"}` : "Finish and sign"}
        </button>
        {answered < total && (
          <span className="ds-foot-hint">
            {total - answered} {total - answered === 1 ? "item" : "items"} still to answer
          </span>
        )}
      </footer>
    </form>
  );
}
