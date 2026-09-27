"use client";

import { useState } from "react";
import { setThemeAction } from "@/lib/actions/theme";
import type { Theme } from "@/lib/theme";
import { IconMonitor, IconMoon, IconSun } from "@/components/ui/icons";

const OPTIONS: { value: Theme; label: string; Icon: typeof IconSun }[] = [
  { value: "light", label: "Light", Icon: IconSun },
  { value: "dark", label: "Dark", Icon: IconMoon },
  { value: "system", label: "System", Icon: IconMonitor },
];

export function ThemeToggle({ theme }: { theme: Theme }) {
  const [current, setCurrent] = useState(theme);

  function choose(next: Theme) {
    setCurrent(next);
    if (next === "system") {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.style.removeProperty("color-scheme");
    } else {
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.style.setProperty("color-scheme", next);
    }
    setThemeAction(next);
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-surface-muted p-0.5">
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            aria-label={o.label}
            title={o.label}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              active ? "bg-surface text-foreground shadow-sm" : "text-foreground/45 hover:text-foreground/80"
            }`}
          >
            <o.Icon width={14} height={14} />
          </button>
        );
      })}
    </div>
  );
}
