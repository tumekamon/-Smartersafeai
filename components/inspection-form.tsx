"use client";

import { useActionState, useState } from "react";
import { submitInspection } from "@/lib/actions/inspections";
import type { ChecklistResponseValue, InspectionTemplate } from "@/lib/types";

const VALUE_OPTIONS: { value: ChecklistResponseValue; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "na", label: "N/A" },
];

export function InspectionForm({
  projectId,
  templates,
  initialTemplateId,
}: {
  projectId: string;
  templates: InspectionTemplate[];
  initialTemplateId?: string;
}) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? templates[0]?.id ?? "");
  const [state, action, pending] = useActionState(submitInspection, undefined);
  const template = templates.find((t) => t.id === templateId);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="templateId" value={templateId} />

      <div>
        <label htmlFor="template" className="mb-1 block text-sm font-medium">
          Inspection template
        </label>
        <select
          id="template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent md:w-96"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {template && (
          <p className="mt-1.5 text-xs text-foreground/50">
            Evidence: <span className="font-medium">{template.evidenceRequirement}</span> · AI
            analysis: <span className="font-medium">{template.aiAnalysisEnabled ? "enabled" : "disabled"}</span>
          </p>
        )}
      </div>

      {template && (
        <div className="space-y-3">
          {template.checklist.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-medium">{item.label}</p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-3">
                  {VALUE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name={`response_${item.id}`}
                        value={opt.value}
                        defaultChecked={opt.value === "pass"}
                        required
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  name={`note_${item.id}`}
                  placeholder="Optional note"
                  className="min-w-[180px] flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-sidebar-accent"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {template && template.evidenceRequirement !== "disabled" && (
        <div>
          <label htmlFor="evidence" className="mb-1 block text-sm font-medium">
            Photo evidence
            {template.evidenceRequirement === "required" && (
              <span className="text-critical"> *</span>
            )}
          </label>
          <input
            id="evidence"
            type="file"
            name="evidence"
            accept="image/*"
            multiple
            required={template.evidenceRequirement === "required"}
            className="block w-full text-sm"
          />
          {template.aiAnalysisEnabled && (
            <p className="mt-1 text-xs text-foreground/50">
              Uploaded photos are queued for AI hazard analysis and always reviewed by a safety
              professional before any finding is confirmed.
            </p>
          )}
        </div>
      )}

      {state?.error && (
        <p className="form-error">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !template}
        className="rounded-md bg-sidebar-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit inspection"}
      </button>
    </form>
  );
}
