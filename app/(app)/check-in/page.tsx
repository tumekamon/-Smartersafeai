import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCheckInForDay } from "@/lib/db";
import { workingSites } from "@/lib/site-focus";
import { CHECK_IN_PPE, checkInDay } from "@/lib/check-in";
import { nowMs } from "@/lib/time";
import { CheckInForm } from "@/components/check-in-form";
import { CheckInBanner } from "@/components/check-in-status";
import { IconChevronLeft } from "@/components/ui/icons";

/** Start-of-day PPE check-in (design canvas W03). */
export default async function CheckInPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).mustCheckIn) redirect("/dashboard");

  const now = nowMs();
  const today = getCheckInForDay(user.companyId, user.id, checkInDay(now));
  const sites = (await workingSites(user)).filter((p) => p.status === "active");
  const done = today && today.status !== "rejected";
  const date = new Date(now).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-[22px]">
      <Link href="/dashboard" className="ds-back self-start">
        <IconChevronLeft width={18} height={18} /> My Day
      </Link>
      <header className="flex flex-col gap-3">
        <span className="eyebrow">{date} · before your shift</span>
        <h1 className="disp text-[36px] leading-none">PPE check-in</h1>
      </header>

      {today && <CheckInBanner checkIn={today} />}

      {done ? (
        today.photo.dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={today.photo.dataUrl} alt="Your check-in photo" className="mx-auto w-full max-w-sm rounded-xl" />
        )
      ) : sites.length === 0 ? (
        <p className="border-t-2 border-brand py-5 text-[15px] text-body">You&apos;re not on any active site yet. Ask your safety manager to add you to a crew.</p>
      ) : (
        <CheckInForm
          sites={sites.map(({ id, shortName, geofence }) => ({ id, shortName, geofence }))}
          ppe={CHECK_IN_PPE}
          workerName={`${user.firstName} ${user.lastName}`}
        />
      )}
    </div>
  );
}
