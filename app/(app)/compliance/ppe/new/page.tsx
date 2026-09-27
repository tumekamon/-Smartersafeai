import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createPpeItemAction } from "@/lib/actions/compliance";
import Link from "next/link";

export default async function LogPpePage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) redirect("/compliance");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/compliance?tab=ppe" className="text-xs font-medium text-sidebar-accent">
          ← Back to PPE
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Receive PPE</h1>
        <p className="mt-1 text-sm text-foreground/60">Add new personal protective equipment to inventory.</p>
      </div>

      <form action={createPpeItemAction} className="card space-y-4 p-5">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Item name</span>
          <input name="name" required placeholder="e.g. Safety Glasses (Clear)" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Quantity received</span>
            <input type="number" name="received" required min={1} placeholder="100" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Already issued</span>
            <input type="number" name="issued" defaultValue={0} min={0} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Reorder point</span>
            <input type="number" name="reorderPoint" required min={0} placeholder="20" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Unit cost ($)</span>
            <input type="number" name="unitCost" required min={0} step="0.01" placeholder="4.50" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Add to inventory
          </button>
        </div>
      </form>
    </div>
  );
}
