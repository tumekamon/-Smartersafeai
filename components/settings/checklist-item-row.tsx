"use client";

import { useState } from "react";
import { removeChecklistItemAction, updateChecklistItemAction } from "@/lib/actions/settings";
import type { ChecklistItem } from "@/lib/types";
import { HazardFields } from "@/components/settings/hazard-fields";
import { RiskBadge } from "@/components/ui/badges";
import { IconTrash } from "@/components/ui/icons";

export function ChecklistItemRow({
  templateId,
  item,
  categories,
}: {
  templateId: string;
  item: ChecklistItem;
  categories: string[];
}) {
  const [editing, setEditing] = useState(false);

  async function handleSave(formData: FormData) {
    await updateChecklistItemAction(formData);
    setEditing(false);
  }

  if (!editing) {
    return (
      <li className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{item.label}</p>
          <p className="mt-0.5 text-xs text-foreground/50">
            {item.hazard.category} · {item.hazard.title}
            {item.hazard.regulatoryReference ? ` · ${item.hazard.regulatoryReference}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RiskBadge level={item.hazard.risk} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-foreground/60 hover:bg-surface-muted"
          >
            Edit
          </button>
          <form action={removeChecklistItemAction}>
            <input type="hidden" name="templateId" value={templateId} />
            <input type="hidden" name="itemId" value={item.id} />
            <button type="submit" className="rounded-lg p-1.5 text-foreground/40 hover:bg-red-500/10 hover:text-critical">
              <IconTrash width={14} height={14} />
            </button>
          </form>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border p-4">
      <form action={handleSave} className="space-y-3">
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="itemId" value={item.id} />
        <HazardFields categories={categories} defaults={{ ...item.hazard, label: item.label }} />
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-3 py-1.5 text-sm font-semibold text-white">
            Save item
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/60 hover:bg-surface-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
