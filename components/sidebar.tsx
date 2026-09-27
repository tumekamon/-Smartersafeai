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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg px-4 py-6 md:flex">
      <div className="mb-10 flex items-center gap-3">
        <span className="brand-mark flex h-8 w-8 items-center justify-center rounded-md text-white shadow-sm">
          <IconCheckShield width={18} height={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-sidebar-fg-active tracking-tight">SmartSafe AI</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-fg/60">Intelligence</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map(({ href, label, Icon, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const count = badgeKey ? badges[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? "sidebar-nav-active border-l-2 border-brand" : "sidebar-nav-inactive border-l-2 border-transparent"
              }`}
            >
              <Icon width={16} height={16} className={active ? "text-brand" : "text-sidebar-fg/70 group-hover:text-sidebar-fg-active"} />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="rounded bg-ai px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-panel mt-6 rounded-md border border-sidebar-border/50 px-4 py-3">
        <p className="text-xs font-bold text-sidebar-fg-active tracking-tight">{companyName}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-sidebar-fg/70">
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '2px' }} />
          {projectCount} Active Projects
        </p>
      </div>
    </aside>
  );
}
