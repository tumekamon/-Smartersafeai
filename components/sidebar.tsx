"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import type { UserRole } from "@/lib/types";
import {
  IconCheckShield,
  IconClipboardCheck,
  IconFileCheck,
  IconFolder,
  IconGrid,
  IconInbox,
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
      { href: "/projects", label: "Sites", Icon: IconFolder },
      { href: "/corrective-actions", label: "My Tasks", Icon: IconClipboardCheck },
    ];
  }
  if (role === "CLIENT_VIEWER") {
    return [
      { href: "/dashboard", label: "Overview", Icon: IconGrid },
      { href: "/projects", label: "Projects", Icon: IconFolder },
      { href: "/corrective-actions", label: "Corrective Actions", Icon: IconClipboardCheck },
      { href: "/compliance", label: "Compliance", Icon: IconFileCheck },
    ];
  }
  const items: NavItem[] = [{ href: "/dashboard", label: "Command Center", Icon: IconGrid }];
  if (REVIEWERS.includes(role)) items.push({ href: "/review", label: "AI Review", Icon: IconSparkle, badgeKey: "review" });
  items.push(
    { href: "/projects", label: "Projects", Icon: IconFolder },
    { href: "/inspections", label: "Inspections", Icon: IconInbox },
    { href: "/corrective-actions", label: "Corrective Actions", Icon: IconClipboardCheck },
    { href: "/compliance", label: "Compliance", Icon: IconFileCheck }
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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar-bg px-3 py-5 md:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, #2f6df6, #7a5cff)" }}
        >
          <IconCheckShield width={19} height={19} />
        </span>
        <div>
          <p className="text-sm font-semibold text-sidebar-fg-active">SmartSafe AI</p>
          <p className="text-[11px] text-sidebar-fg/70">Safety Intelligence</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ href, label, Icon, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const count = badgeKey ? badges[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-sidebar-fg-active"
                  : "text-sidebar-fg hover:bg-white/5 hover:text-sidebar-fg-active"
              }`}
            >
              <Icon width={17} height={17} />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="rounded-full bg-ai px-2 py-0.5 text-[11px] font-semibold text-white">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl bg-white/5 px-3 py-3">
        <p className="text-xs font-semibold text-sidebar-fg-active">{companyName}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-sidebar-fg/55">
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          {projectCount} active projects
        </p>
      </div>
    </aside>
  );
}
