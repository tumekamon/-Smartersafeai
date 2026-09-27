"use client";

import { useState } from "react";
import { createTemplateAction } from "@/lib/actions/settings";
import { IconPlus } from "@/components/ui/icons";

export function NewTemplateForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground/60 transition-colors hover:border-sidebar-accent hover:text-sidebar-accent"
      >
        <IconPlus width={14} height={14} />
        New template
      </button>
    );
  }

  return (
    <form action={createTemplateAction} className="space-y-3 rounded-xl border border-border p-4">
      <input
        name="name"
        required
        autoFocus
        placeholder="Template name, e.g. Confined Space Entry"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Photos
          <select name="evidenceRequirement" defaultValue="optional" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm">
            <option value="disabled">Off</option>
            <option value="optional">Optional</option>
            <option value="required">Required</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="aiAnalysisEnabled" defaultChecked className="h-4 w-4" />
          AI review
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-sidebar-accent px-3 py-1.5 text-sm font-semibold text-white">
          Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/60 hover:bg-surface-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
