import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { updateProfileAction } from "@/lib/actions/users";
import { logout } from "@/lib/actions/auth";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { MyCertifications } from "@/components/certifications/my-certifications";
import { listCertificationRecords } from "@/lib/db";
import { roleLabel } from "@/lib/roles";
import { usesWorkingSite, workingSite } from "@/lib/site-focus";
import { nowMs } from "@/lib/time";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

/** A row that opens in place, styled like the design's account rows. */
function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3.5 text-base [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{title}</span>
        <IconChevronRight width={18} height={18} className="shrink-0 text-muted transition-transform group-open:rotate-90" />
      </summary>
      <div className="pb-5 pt-1">{children}</div>
    </details>
  );
}

/**
 * My profile (design canvas W12): who you are, "01 / My certificates" and "02 / Account"
 * (your details, password, sign out). Details and password open in place.
 */
export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const user = await getCurrentUser();
  const { sent } = await searchParams;
  const records = user.readOnly ? [] : listCertificationRecords(user.companyId, { userId: user.id });
  const site = usesWorkingSite(user) ? await workingSite(user) : undefined;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-[22px]">
      <Link href="/more" className="ds-back self-start">
        <IconChevronLeft width={18} height={18} /> More
      </Link>

      <header className="flex items-center gap-4">
        <span className="disp flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#0F4C81] text-2xl text-white">{initials}</span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="disp text-[30px] leading-none">
            {user.firstName} {user.lastName}
          </h1>
          <span className="text-sm text-body">{[user.title, roleLabel(user).replace(" · ", " "), site?.shortName].filter(Boolean).join(" · ")}</span>
        </div>
      </header>

      {!user.readOnly && <MyCertifications records={records} now={nowMs()} justSent={sent === "1"} />}

      <section aria-labelledby="account-head" className="flex flex-col">
        <div className="ds-sec">
          <h2 id="account-head" className="eyebrow" style={{ color: "var(--foreground)" }}>
            {user.readOnly ? "Account" : "02 / Account"}
          </h2>
        </div>

        <Disclosure title="Your details">
          <form action={updateProfileAction} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[15px] font-medium">First name</span>
                <input name="firstName" required defaultValue={user.firstName} autoComplete="given-name" className="ds-field" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[15px] font-medium">Last name</span>
                <input name="lastName" required defaultValue={user.lastName} autoComplete="family-name" className="ds-field" />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-[15px] font-medium">Title</span>
              <input name="title" defaultValue={user.title} className="ds-field" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[15px] font-medium">Work phone</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 859 555 0100" defaultValue={user.phone ?? ""} className="ds-field" />
              <span className="text-[13px] text-body">Your crew sees this as a call button.</span>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[15px] font-medium">Email</span>
              <input readOnly disabled value={user.email} className="ds-field opacity-60" />
              <span className="text-[13px] text-body">Email cannot be changed</span>
            </label>
            <button type="submit" className="ds-btn ds-btn-primary min-h-12 text-[15px]">
              Save changes
            </button>
          </form>
        </Disclosure>

        <Disclosure title="Change password">
          <ChangePasswordForm />
        </Disclosure>

        <form action={logout}>
          <button type="submit" className="flex min-h-14 w-full items-center border-b border-border text-left text-base tone-critical">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
