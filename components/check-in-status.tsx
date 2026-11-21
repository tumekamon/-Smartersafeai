import Link from "next/link";
import type { CheckIn } from "@/lib/types";
import { getProject, getUser } from "@/lib/db";
import { IconArrowRight, IconCamera, IconCheck, IconClock, IconX } from "@/components/ui/icons";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** The worker's check-in for today, as one banner: not done, waiting, approved, or rejected (redo). */
export function CheckInBanner({ checkIn }: { checkIn: CheckIn | undefined }) {
  if (!checkIn || checkIn.status === "rejected") {
    const reviewer = checkIn?.reviewedById ? getUser(checkIn.reviewedById) : undefined;
    return (
      <Link
        href="/check-in"
        className="flex min-h-20 items-center gap-4 rounded-2xl bg-foreground px-5 py-4 text-background shadow-lg"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background/15">
          {checkIn ? <IconX width={26} height={26} strokeWidth={2.2} /> : <IconCamera width={26} height={26} strokeWidth={2} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">{checkIn ? "Check in again" : "Check in for today"}</span>
          <span className="block text-sm opacity-80">
            {checkIn
              ? `${reviewer ? `${reviewer.firstName}: ` : ""}${checkIn.reviewNote ?? "Your check-in was not accepted."}`
              : "PPE photo on site before you start"}
          </span>
        </span>
        <IconArrowRight width={22} height={22} />
      </Link>
    );
  }

  const site = getProject(checkIn.projectId)?.shortName;
  const approved = checkIn.status === "approved";
  return (
    <Link href="/check-in" className="card flex min-h-16 items-center gap-3 px-4 py-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${approved ? "bg-status-good" : "bg-status-warning"}`}
      >
        {approved ? <IconCheck width={22} height={22} strokeWidth={2.6} /> : <IconClock width={22} height={22} strokeWidth={2.2} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{approved ? "Checked in" : "Checked in · waiting for your supervisor"}</span>
        <span className="block text-sm text-foreground/60">
          {site} · {time(checkIn.capturedAt)}
        </span>
      </span>
    </Link>
  );
}
