import { getCurrentUser } from "@/lib/dal";
import { updateProfileAction } from "@/lib/actions/users";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-xl space-y-6">
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
    </div>
  );
}
