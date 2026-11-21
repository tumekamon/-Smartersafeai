import { getCurrentUser } from "@/lib/dal";
import { updateProfileAction } from "@/lib/actions/users";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { MyCertifications } from "@/components/certifications/my-certifications";
import { listCertificationRecords } from "@/lib/db";
import { nowMs } from "@/lib/time";

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const user = await getCurrentUser();
  const { sent } = await searchParams;
  const records = user.readOnly ? [] : listCertificationRecords(user.companyId, { userId: user.id });

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>

      <form action={updateProfileAction} className="card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">First name</span>
            <input
              name="firstName"
              required
              defaultValue={user.firstName}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Last name</span>
            <input
              name="lastName"
              required
              defaultValue={user.lastName}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
            />
          </label>
        </div>
        
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Title</span>
          <input
            name="title"
            defaultValue={user.title}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
        </label>
        
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Work phone</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+1 859 555 0100"
            defaultValue={user.phone ?? ""}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent"
          />
          <span className="mt-1 block text-[11px] text-foreground/45">Your crew sees this as a call button on their site card.</span>
        </label>

        <label className="block text-sm opacity-60">
          <span className="mb-1.5 block font-medium text-foreground/80">Email</span>
          <input
            readOnly
            disabled
            value={user.email}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
          />
          <span className="mt-1 block text-[11px] text-foreground/45">Email cannot be changed</span>
        </label>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Save changes
          </button>
        </div>
      </form>

      {!user.readOnly && <MyCertifications records={records} now={nowMs()} justSent={sent === "1"} />}

      <ChangePasswordForm />
    </div>
  );
}
