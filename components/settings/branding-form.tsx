"use client";

import { useState } from "react";
import Image from "next/image";
import { updateBrandingAction } from "@/lib/actions/settings";
import { deriveDarkBrand } from "@/lib/color";
import { IconCheckShield, IconMoon, IconSun } from "@/components/ui/icons";

const SWATCHES = ["#2f6df6", "#7a5cff", "#0ca35f", "#d0913b", "#d0453b", "#0f8b8d", "#c23b8f", "#1c1f26"];
const HERO_IMAGES = [
  { src: "/bg-hero.jpg", label: "Sunset Cranes" },
  { src: "/p_lex_medical.jpg", label: "Steel Frame" },
  { src: "/p_louisville.jpg", label: "Concrete Core" },
  { src: "/p_markey.jpg", label: "Tower Ascending" },
];

export function BrandingForm({ name, primaryColor, heroImage = "/bg-hero.jpg" }: { name: string; primaryColor: string; heroImage?: string }) {
  const [color, setColor] = useState(primaryColor);
  const [companyName, setCompanyName] = useState(name);
  const [selectedHero, setSelectedHero] = useState(heroImage);

  return (
    <form action={updateBrandingAction} className="space-y-6">
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white"
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
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
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
              className="h-8 w-8 rounded-md transition-transform hover:scale-110"
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
            className="h-8 w-8 cursor-pointer rounded-md border border-border bg-transparent p-0"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-xs font-mono outline-none focus:border-sidebar-accent"
          />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-foreground/55">
          <span className="flex items-center gap-1.5">
            <IconSun width={12} height={12} />
            <span className="h-4 w-4 rounded-md border border-border" style={{ background: color }} />
            Light mode
          </span>
          <span className="flex items-center gap-1.5">
            <IconMoon width={12} height={12} />
            <span className="h-4 w-4 rounded-md border border-border" style={{ background: deriveDarkBrand(color) }} />
            Dark mode (auto-adjusted)
          </span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-foreground/60">Company Hero Image</label>
        <input type="hidden" name="heroImage" value={selectedHero} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HERO_IMAGES.map((img) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setSelectedHero(img.src)}
              className="group relative overflow-hidden rounded-md border-2 transition-all focus:outline-none"
              style={{
                borderColor: selectedHero === img.src ? color : "transparent",
              }}
            >
              <div className="aspect-[4/3] relative w-full">
                <Image src={img.src} alt={img.label} fill className="object-cover" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
                <p className="truncate text-[10px] font-medium text-white">{img.label}</p>
              </div>
              {selectedHero === img.src && (
                <div className="absolute right-1.5 top-1.5 rounded-md bg-white p-0.5 shadow-sm">
                  <IconCheckShield width={12} height={12} style={{ color }} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
      >
        Save branding
      </button>
    </form>
  );
}
