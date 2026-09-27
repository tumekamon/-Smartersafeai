"use client";

import { useState } from "react";
import { addChecklistItemAction } from "@/lib/actions/settings";
import { HazardFields } from "@/components/settings/hazard-fields";
import { IconPlus } from "@/components/ui/icons";

export function AddChecklistItemForm({ templateId, categories }: { templateId: string; categories: string[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground/60 transition-colors hover:border-sidebar-accent hover:text-sidebar-accent"
      >
        <IconPlus width={14} height={14} />
        Add checklist item
      </button>
    );
  }

  async function handleAdd(formData: FormData) {
    await addChecklistItemAction(formData);
    setOpen(false);
  }

  return (
    <form action={handleAdd} className="mt-3 space-y-3 rounded-xl border border-border p-4">
      <input type="hidden" name="templateId" value={templateId} />
      <HazardFields categories={categories} />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-sidebar-accent px-3 py-1.5 text-sm font-semibold text-white">
          Add item
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
