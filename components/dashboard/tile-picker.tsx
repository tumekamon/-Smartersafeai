"use client";

import { useState } from "react";
import { saveDashboardTilesAction } from "@/lib/actions/dashboard";
import { IconCheck } from "@/components/ui/icons";

export function TilePicker({
  catalog,
  selected,
  max,
}: {
  catalog: { id: string; label: string }[];
  selected: string[];
  max: number;
}) {
  const [picked, setPicked] = useState<string[]>(selected);
  const full = picked.length >= max;
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : full ? p : [...p, id]));

  return (
    <form action={saveDashboardTilesAction} className="space-y-5">
      <p className="text-sm font-semibold text-foreground/60">
        {picked.length} of {max} picked
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {catalog.map((t) => {
          const on = picked.includes(t.id);
          const disabled = !on && full;
          return (
            <label
              key={t.id}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-4 ring-1 transition-colors ${
                on ? "bg-foreground text-background ring-foreground" : "bg-surface ring-border hover:bg-surface-muted"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                name="tile"
                value={t.id}
                checked={on}
                disabled={disabled}
                onChange={() => toggle(t.id)}
                className="sr-only"
              />
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${on ? "bg-background text-foreground" : "ring-1 ring-border"}`}>
                {on && <IconCheck width={16} height={16} strokeWidth={2.6} />}
              </span>
              <span className="text-[15px] font-semibold">{t.label}</span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={picked.length === 0}
          className="min-h-12 rounded-xl bg-sidebar-accent px-6 text-[15px] font-bold text-white disabled:opacity-50"
        >
          Save tiles
        </button>
        <button type="submit" name="reset" value="1" formNoValidate className="min-h-12 rounded-xl px-5 text-[15px] font-semibold text-foreground/70 ring-1 ring-border hover:bg-surface-muted">
          Reset to default
        </button>
      </div>
    </form>
  );
}
