import Link from "next/link";
import type { Project } from "@/lib/types";
import { IconArrowRight, IconPhone, IconSiren } from "@/components/ui/icons";

/** Always one tap from 911 and the site's emergency info, on every worker home screen. */
export function EmergencyStrip({ project }: { project: Project }) {
  return (
    <div className="flex items-stretch gap-2">
      <a
        href="tel:911"
        className="flex min-h-14 shrink-0 items-center gap-2 rounded-xl bg-status-critical px-4 text-[15px] font-bold text-white"
      >
        <IconPhone width={20} height={20} strokeWidth={2.2} />
        Call 911
      </a>
      <Link
        href="/emergency"
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl border border-status-critical/30 bg-status-critical/[0.07] px-4 text-status-critical transition-colors hover:bg-status-critical/[0.12]"
      >
        <IconSiren width={20} height={20} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">Emergency info</span>
          <span className="block truncate text-xs font-medium text-foreground/60">
            {project.emergency?.musterPoint ? `Muster: ${project.emergency.musterPoint}` : "First aiders, hospital, what to do"}
          </span>
        </span>
        <IconArrowRight width={18} height={18} className="shrink-0" />
      </Link>
    </div>
  );
}
