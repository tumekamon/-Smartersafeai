"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItemsForRole } from "@/components/sidebar";
import { IconMenu } from "@/components/ui/icons";
import type { UserRole } from "@/lib/types";

export function MobileNav({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label="Toggle navigation"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
      >
        <IconMenu width={16} height={16} />
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-20 w-56 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          {items.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  active ? "bg-surface-muted font-medium" : "hover:bg-surface-muted"
                }`}
              >
                <Icon width={16} height={16} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
