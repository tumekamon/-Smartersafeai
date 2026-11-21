import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCheckInForDay } from "@/lib/db";
import { workingSites } from "@/lib/site-focus";
import { CHECK_IN_PPE, checkInDay } from "@/lib/check-in";
import { nowMs } from "@/lib/time";
import { CheckInForm } from "@/components/check-in-form";
import { CheckInBanner } from "@/components/check-in-status";

export default async function CheckInPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).mustCheckIn) redirect("/dashboard");

  const today = getCheckInForDay(user.companyId, user.id, checkInDay(nowMs()));
  const sites = (await workingSites(user)).filter((p) => p.status === "active");
  const done = today && today.status !== "rejected";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Daily check-in</h1>
        {!done && <p className="mt-1 text-sm text-foreground/60">Take a photo of yourself in your PPE, on site, before you start work.</p>}
      </div>

      {today && <CheckInBanner checkIn={today} />}

      {done ? (
        today.photo.dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={today.photo.dataUrl} alt="Your check-in photo" className="w-full rounded-3xl" />
        )
      ) : sites.length === 0 ? (
        <p className="card p-5 text-sm">You&apos;re not on any active site yet. Ask your safety manager to add you to a crew.</p>
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
