"use client";

import { useState } from "react";
import { updateBrandingAction } from "@/lib/actions/settings";
import { deriveDarkBrand } from "@/lib/color";
import { IconCheckShield, IconMoon, IconSun } from "@/components/ui/icons";

const SWATCHES = ["#2f6df6", "#7a5cff", "#0ca35f", "#d0913b", "#d0453b", "#0f8b8d", "#c23b8f", "#1c1f26"];

export function BrandingForm({ name, primaryColor }: { name: string; primaryColor: string }) {
  const [color, setColor] = useState(primaryColor);
  const [companyName, setCompanyName] = useState(name);

  return (
    <form action={updateBrandingAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ background: `linear-gradient(135deg, ${color}, #7a5cff)` }}
        >
          <IconCheckShield width={26} height={26} />
        </span>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-foreground/60">Company name</label>
          <input
            name="name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-foreground/60">Accent color</label>
        <input type="hidden" name="primaryColor" value={color} />
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((sw) => (
            <button
              key={sw}
              type="button"
              onClick={() => setColor(sw)}
              aria-label={sw}
              className="h-8 w-8 rounded-full transition-transform hover:scale-110"
              style={{
                background: sw,
                boxShadow: color.toLowerCase() === sw.toLowerCase() ? `0 0 0 2px var(--surface), 0 0 0 4px ${sw}` : undefined,
              }}
            />
          ))}
          <span className="mx-1 h-6 w-px bg-border" />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-full border border-border bg-transparent p-0"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-mono outline-none focus:border-sidebar-accent"
          />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-foreground/55">
          <span className="flex items-center gap-1.5">
            <IconSun width={12} height={12} />
            <span className="h-4 w-4 rounded-full border border-border" style={{ background: color }} />
            Light mode
          </span>
          <span className="flex items-center gap-1.5">
            <IconMoon width={12} height={12} />
            <span className="h-4 w-4 rounded-full border border-border" style={{ background: deriveDarkBrand(color) }} />
            Dark mode (auto-adjusted)
          </span>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-sidebar-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Save branding
      </button>
    </form>
  );
}
