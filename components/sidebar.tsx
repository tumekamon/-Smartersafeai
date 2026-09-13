"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { IconCheckShield, IconClipboardCheck, IconFolder, IconGrid } from "@/components/ui/icons";

export function navItemsForRole(role: UserRole) {
  return [
    { href: "/dashboard", label: "Dashboard", Icon: IconGrid },
    { href: "/projects", label: "Projects", Icon: IconFolder },
    {
      href: "/corrective-actions",
      label: role === "WORKER" ? "My Tasks" : "Corrective Actions",
      Icon: IconClipboardCheck,
    },
  ];
}

export function Sidebar({ role, companyName }: { role: UserRole; companyName: string }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar-bg px-3 py-5 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-white">
          <IconCheckShield width={19} height={19} />
        </span>
        <div>
          <p className="text-sm font-semibold text-sidebar-fg-active">SmartSafe AI</p>
          <p className="text-[11px] text-sidebar-fg/70">Safety Intelligence</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-sidebar-fg-active"
                  : "text-sidebar-fg hover:bg-white/5 hover:text-sidebar-fg-active"
              }`}
            >
              <Icon width={17} height={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg bg-white/5 px-3 py-2.5">
        <p className="text-[11px] font-medium text-sidebar-fg-active">{companyName}</p>
        <p className="text-[11px] text-sidebar-fg/50">Environment, Health & Safety</p>
      </div>
    </aside>
  );
}
