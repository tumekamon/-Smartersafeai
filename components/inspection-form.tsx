"use client";

import { useActionState, useState } from "react";
import { submitInspection } from "@/lib/actions/inspections";
import type { ChecklistResponseValue, InspectionTemplate, Project } from "@/lib/types";
import { IconCamera, IconCheck, IconSparkle, IconX } from "@/components/ui/icons";

const OPTIONS: { value: ChecklistResponseValue; label: string; color: string }[] = [
  { value: "pass", label: "Pass", color: "var(--status-good)" },
  { value: "fail", label: "Fail", color: "var(--status-critical)" },
  { value: "na", label: "N/A", color: "var(--status-neutral)" },
];

function Chip({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
        checked ? "bg-foreground text-background" : "bg-surface-muted text-foreground/65 hover:text-foreground"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" required />
      {children}
    </label>
  );
}

export function InspectionForm({
  project,
  templates,
  initialTemplateId,
}: {
  project: Project;
  templates: InspectionTemplate[];
  initialTemplateId?: string;
}) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? templates[0]?.id ?? "");
  const [level, setLevel] = useState(project.levels[Math.min(2, project.levels.length - 1)]);
  const [zone, setZone] = useState(project.zones[0]);
  const [answers, setAnswers] = useState<Record<string, ChecklistResponseValue>>({});
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const [state, action, pending] = useActionState(submitInspection, undefined);
  const template = templates.find((t) => t.id === templateId);

  const answerFor = (id: string) => answers[`${templateId}:${id}`] ?? "pass";
  const failCount = template ? template.checklist.filter((i) => answerFor(i.id) === "fail").length : 0;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="templateId" value={templateId} />

      <section className="card p-5">
        <p className="eyebrow mb-3">1 · Inspection type</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {templates.map((t) => {
            const active = t.id === templateId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className="rounded-xl border p-3.5 text-left transition-all"
                style={{
                  borderColor: active ? "var(--sidebar-accent)" : "var(--border)",
                  boxShadow: active ? "0 0 0 1px var(--sidebar-accent)" : undefined,
                  background: active ? "color-mix(in srgb, var(--sidebar-accent) 6%, var(--surface))" : "var(--surface)",
                }}
              >
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-foreground/60">{t.checklist.length} items</span>
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-foreground/60">
                    Photos {t.evidenceRequirement === "disabled" ? "off" : t.evidenceRequirement}
                  </span>
                  {t.aiAnalysisEnabled && (
                    <span className="ai-chip">
                      <IconSparkle width={11} height={11} />
                      AI review
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5">
        <p className="eyebrow mb-3">2 · Where are you?</p>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs text-foreground/50">Level</span>
            {project.levels.map((l) => (
              <Chip key={l} name="level" value={l} checked={level === l} onChange={() => setLevel(l)}>{l}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs text-foreground/50">Zone</span>
            {project.zones.map((z) => (
              <Chip key={z} name="zone" value={z} checked={zone === z} onChange={() => setZone(z)}>{z}</Chip>
            ))}
          </div>
        </div>
      </section>

      {template && (
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">3 · Checklist</p>
            {failCount > 0 && <span className="badge badge-critical">{failCount} failing</span>}
          </div>
          <ul className="divide-y divide-border">
            {template.checklist.map((item) => {
              const value = answerFor(item.id);
              return (
                <li key={`${template.id}-${item.id}`} className="py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.label}</p>
                    <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
                      {OPTIONS.map((o) => {
                        const active = value === o.value;
                        return (
                          <label
                            key={o.value}
                            className="flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                            style={{
                              background: active ? o.color : "transparent",
                              color: active ? "#fff" : "var(--foreground)",
                              opacity: active ? 1 : 0.6,
                            }}
                          >
                            <input
                              type="radio"
                              name={`response_${item.id}`}
                              value={o.value}
                              checked={active}
                              onChange={() => setAnswers((a) => ({ ...a, [`${template.id}:${item.id}`]: o.value }))}
                              className="sr-only"
                            />
                            {o.value === "pass" && <IconCheck width={12} height={12} />}
                            {o.value === "fail" && <IconX width={12} height={12} />}
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  {value === "fail" && (
                    <input
                      type="text"
                      name={`note_${item.id}`}
                      placeholder="What did you see?"
                      className="mt-2.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {template && template.evidenceRequirement !== "disabled" && (
        <section className="card p-5">
          <p className="eyebrow mb-3">
            4 · Photos {template.evidenceRequirement === "required" && <span className="text-critical">required</span>}
          </p>
          <label
            htmlFor="evidence"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-sidebar-accent"
          >
            <IconCamera width={26} height={26} className="text-foreground/40" />
            <span className="text-sm font-medium">Take or upload photos</span>
          </label>
          <input
            id="evidence"
            type="file"
            name="evidence"
            accept="image/*"
            capture="environment"
            multiple
            required={template.evidenceRequirement === "required"}
            className="sr-only"
            onChange={(e) =>
              setPreviews(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f) })))
            }
          />
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {previews.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.url} src={p.url} alt={p.name} className="h-20 w-20 rounded-lg object-cover ring-1 ring-border" />
              ))}
            </div>
          )}
        </section>
      )}

      {state?.error && <p className="form-error">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !template}
        className="w-full rounded-xl bg-sidebar-accent px-4 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Submitting…" : failCount > 0 ? `Submit with ${failCount} finding${failCount === 1 ? "" : "s"}` : "Submit inspection"}
      </button>
    </form>
  );
}
