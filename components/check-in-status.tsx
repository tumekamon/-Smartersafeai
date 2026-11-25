import Link from "next/link";
import type { CheckIn } from "@/lib/types";
import { getProject, getUser } from "@/lib/db";
import { IconArrowRight, IconCheck, IconClock } from "@/components/ui/icons";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * The worker's check-in for today (design canvas W02). Not done or turned down: the
 * safety-blue "Before you start" card. Done: one quiet line with its review state.
 */
export function CheckInBanner({ checkIn }: { checkIn: CheckIn | undefined }) {
  if (!checkIn || checkIn.status === "rejected") {
    const reviewer = checkIn?.reviewedById ? getUser(checkIn.reviewedById) : undefined;
    return (
      // The design's exact blue in both themes: this card is the one thing to do before work.
      <Link href="/check-in" className="group flex items-center gap-4 rounded-xl bg-[#0F4C81] px-5 py-[18px] text-white">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#DCEBF7]">
            {checkIn ? "Not accepted · do it again" : "Before you start"}
          </span>
          <span className="text-lg font-semibold">PPE check-in</span>
          {checkIn && (
            <span className="text-sm text-[#DCEBF7]">
              {reviewer ? `${reviewer.firstName}: ` : ""}
              {checkIn.reviewNote ?? "Your check-in was not accepted."}
            </span>
          )}
        </span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0F4C81] transition-transform group-hover:translate-x-0.5">
          <IconArrowRight width={18} height={18} strokeWidth={2.2} />
        </span>
      </Link>
    );
  }

  const site = getProject(checkIn.projectId)?.shortName;
  const approved = checkIn.status === "approved";
  return (
    <Link href="/check-in" className="flex items-center gap-3.5 border-b border-border pb-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${approved ? "bg-status-good" : "bg-status-warning"}`}
      >
        {approved ? <IconCheck width={18} height={18} strokeWidth={2.6} /> : <IconClock width={18} height={18} strokeWidth={2.2} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold">Checked in · {time(checkIn.capturedAt)}</span>
        <span className="truncate text-sm text-body">{site}</span>
      </span>
      <span className={`ds-tag shrink-0 ${approved ? "ds-tag-good" : "ds-tag-warn"}`}>{approved ? "Accepted" : "Being checked"}</span>
    </Link>
  );
}
