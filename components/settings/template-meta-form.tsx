"use client";

import { useState } from "react";
import { deleteTemplateAction, updateTemplateAction } from "@/lib/actions/settings";
import type { InspectionTemplate } from "@/lib/types";
import { IconTrash } from "@/components/ui/icons";

export function TemplateMetaForm({ template }: { template: InspectionTemplate }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="space-y-4">
      <form action={updateTemplateAction} className="space-y-3">
        <input type="hidden" name="templateId" value={template.id} />
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/60">Template name</label>
          <input
            name="name"
            defaultValue={template.name}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent sm:max-w-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            Photos
            <select
              name="evidenceRequirement"
              defaultValue={template.evidenceRequirement}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            >
              <option value="disabled">Off</option>
              <option value="optional">Optional</option>
              <option value="required">Required</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="aiAnalysisEnabled" defaultChecked={template.aiAnalysisEnabled} className="h-4 w-4" />
            AI review
          </label>
        </div>
        <button type="submit" className="rounded-lg bg-sidebar-accent px-3 py-1.5 text-sm font-semibold text-white">
          Save
        </button>
      </form>

      <div className="border-t border-border pt-4">
        {confirmingDelete ? (
          <form action={deleteTemplateAction} className="flex items-center gap-2">
            <input type="hidden" name="templateId" value={template.id} />
            <span className="text-sm text-foreground/60">Delete this template? This can&apos;t be undone.</span>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
              style={{ background: "var(--status-critical)" }}
            >
              Confirm delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/60 hover:bg-surface-muted"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-critical hover:opacity-75"
          >
            <IconTrash width={14} height={14} />
            Delete template
          </button>
        )}
      </div>
    </div>
  );
}
