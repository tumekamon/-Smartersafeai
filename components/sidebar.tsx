"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import type { UserRole } from "@/lib/types";
import {
  IconAlertTriangle,
  IconCheckShield,
  IconClipboardCheck,
  IconFileCheck,
  IconFolder,
  IconGrid,
  IconInbox,
  IconSettings,
  IconSparkle,
} from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badgeKey?: "review";
};

const REVIEWERS: UserRole[] = ["ADMIN", "SAFETY_DIRECTOR", "SAFETY_MANAGER"];

export function navItemsForRole(role: UserRole): NavItem[] {
  if (role === "WORKER") {
    return [
      { href: "/dashboard", label: "My Day", Icon: IconGrid },
      { href: "/projects", label: "Projects", Icon: IconFolder },
      { href: "/corrective-actions", label: "Tasks", Icon: IconClipboardCheck },
      { href: "/incidents", label: "Incidents", Icon: IconAlertTriangle },
      { href: "/settings", label: "Settings", Icon: IconSettings },
    ];
  }
  if (role === "CLIENT_VIEWER") {
    return [
      { href: "/dashboard", label: "Overview", Icon: IconGrid },
      { href: "/projects", label: "Projects", Icon: IconFolder },
      { href: "/corrective-actions", label: "Issues", Icon: IconClipboardCheck },
      { href: "/compliance", label: "Compliance", Icon: IconFileCheck },
      { href: "/incidents", label: "Incidents", Icon: IconAlertTriangle },
      { href: "/settings", label: "Settings", Icon: IconSettings },
    ];
  }
  const items: NavItem[] = [{ href: "/dashboard", label: "Overview", Icon: IconGrid }];
  if (REVIEWERS.includes(role)) items.push({ href: "/review", label: "Inbox", Icon: IconSparkle, badgeKey: "review" });
  items.push(
    { href: "/projects", label: "Projects", Icon: IconFolder },
    { href: "/inspections", label: "Inspections", Icon: IconInbox },
    { href: "/corrective-actions", label: "Issues", Icon: IconClipboardCheck },
    { href: "/incidents", label: "Incidents", Icon: IconAlertTriangle },
    { href: "/compliance", label: "Compliance", Icon: IconFileCheck },
    { href: "/settings", label: "Settings", Icon: IconSettings }
  );
  return items;
}

export function Sidebar({
  role,
  companyName,
  badges,
  projectCount,
}: {
  role: UserRole;
  companyName: string;
  badges: { review: number };
  projectCount: number;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border/40 bg-sidebar-bg/70 backdrop-blur-xl px-4 py-6 md:flex transition-all duration-500 ease-in-out shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
      <div className="mb-10 flex items-center gap-3 px-2">
        <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg shadow-brand/20 transition-transform duration-300 hover:scale-110 hover:rotate-3">
          <IconCheckShield width={20} height={20} />
        </span>
        <div className="flex flex-col">
          <p className="text-[15px] font-extrabold text-sidebar-fg-active tracking-tight bg-gradient-to-br from-sidebar-fg-active to-sidebar-fg bg-clip-text text-transparent">SmartSafe AI</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-sidebar-fg/60">Intelligence</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {items.map(({ href, label, Icon, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const count = badgeKey ? badges[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-300 ${
                active 
                  ? "bg-gradient-to-r from-sidebar-active-bg to-transparent text-brand shadow-[inset_2px_0_0_var(--color-brand)]" 
                  : "text-sidebar-fg/80 hover:bg-sidebar-hover-bg/50 hover:text-sidebar-fg-active hover:translate-x-1"
              }`}
            >
              <Icon width={18} height={18} className={`transition-transform duration-300 ${active ? "text-brand scale-110" : "text-sidebar-fg/60 group-hover:text-sidebar-fg-active group-hover:scale-110"}`} />
              <span className="flex-1 tracking-wide">{label}</span>
              {count > 0 && (
                <span className="rounded-full bg-ai px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_10px_var(--color-ai)] animate-pulse">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-panel mt-6 rounded-xl border border-sidebar-border/30 bg-sidebar-panel-bg/50 px-4 py-3.5 shadow-sm backdrop-blur-md transition-all hover:border-sidebar-border/60 hover:shadow-md">
        <p className="text-xs font-bold text-sidebar-fg-active tracking-tight">{companyName}</p>
        <p className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-sidebar-fg/70">
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '9999px' }} />
          {projectCount} Active Projects
        </p>
      </div>
    </aside>
  );
}
