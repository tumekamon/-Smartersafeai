"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { logout } from "@/lib/actions/auth";
import { BrandLockup } from "@/components/ui/brand-mark";
import {
  IconBell,
  IconCamera,
  IconFileText,
  IconClipboardCheck,
  IconFileCheck,
  IconHome,
  IconLogout,
  IconMapPin,
  IconSettings,
  IconAlertTriangle,
  IconSiren,
} from "@/components/ui/icons";

type Item = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Routes that light this item up. */
  match: string[];
  badge?: number;
  tone?: "critical";
};

/**
 * The worker's sidebar on large screens (CRM style): the SmartSafe lockup, the menu in
 * three groups, and the person at the bottom. Phones and tablets use the bottom tab bar.
 */
export function WorkerSidebar({
  siteId,
  taskBadge,
  unread,
  certsDue,
  incidents,
  person,
}: {
  siteId?: string;
  taskBadge: number;
  unread: number;
  certsDue: number;
  incidents: boolean;
  person: { name: string; initials: string; role: string };
}) {
  const pathname = usePathname();
  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Overview",
      items: [
        { href: "/dashboard", label: "My Day", Icon: IconHome, match: ["/dashboard", "/check-in"] },
        { href: "/corrective-actions", label: "My tasks", Icon: IconClipboardCheck, match: ["/corrective-actions", "/work"], badge: taskBadge },
        { href: "/my-reports", label: "My reports", Icon: IconCamera, match: ["/my-reports", "/hazards"] },
        { href: "/notifications", label: "Notifications", Icon: IconBell, match: ["/notifications"], badge: unread },
      ],
    },
    {
      title: "On site",
      items: [
        ...(siteId
          ? [
              { href: `/projects/${siteId}/inspections/new`, label: "Checklists", Icon: IconFileText, match: ["/inspections", `/projects/${siteId}/inspections`] },
              { href: `/projects/${siteId}`, label: "Site details", Icon: IconMapPin, match: [`/projects/${siteId}`] },
            ]
          : []),
        ...(incidents ? [{ href: "/incidents", label: "Incidents", Icon: IconAlertTriangle, match: ["/incidents"] }] : []),
        { href: "/emergency", label: "Emergency", Icon: IconSiren, match: ["/emergency"], tone: "critical" as const },
      ],
    },
    {
      title: "You",
      items: [
        { href: "/settings/profile", label: "Profile & certificates", Icon: IconFileCheck, match: ["/settings/profile"], badge: certsDue },
        { href: "/more", label: "Settings & menu", Icon: IconSettings, match: ["/more", "/settings"] },
      ],
    },
  ];
  // The most specific match wins, so "Checklists" doesn't also light "Site details".
  const all = groups.flatMap((g) => g.items);
  const hit = (m: string) => pathname === m || pathname.startsWith(`${m}/`);
  const best = all
    .flatMap((i) => i.match.filter(hit).map((m) => ({ i, len: m.length })))
    .sort((a, b) => b.len - a.len)[0]?.i;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink text-white print:hidden lg:flex">
      <Link href="/dashboard" aria-label="SmartSafe home" className="flex h-16 shrink-0 items-center px-6">
        <BrandLockup size={30} />
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1 pl-3">
            <span className="px-3 pb-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#7f97b2]">{g.title}</span>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} aria-current={i === best ? "page" : undefined} className="wk-side-link">
                <i.Icon width={18} height={18} strokeWidth={1.8} className={i.tone === "critical" ? "text-[#F7A29B]" : undefined} />
                <span className="flex-1 truncate">{i.label}</span>
                {!!i.badge && (
                  <span className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 ${i.href === "/settings/profile" ? "bg-hivis text-ink" : "bg-status-critical text-white"}`}>
                    {i.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <Link href="/settings/profile" className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-semibold text-ink">{person.initials}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{person.name}</span>
            <span className="block truncate font-mono text-[10.5px] uppercase tracking-wider text-[#9db6d3]">{person.role}</span>
          </span>
        </Link>
        <form action={logout}>
          <button type="submit" aria-label="Sign out" title="Sign out" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#c9daec] hover:bg-white/10 hover:text-white">
            <IconLogout width={17} height={17} />
          </button>
        </form>
      </div>
    </aside>
  );
}
