import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { listUsers } from "@/lib/db";
import { createCertificationAction } from "@/lib/actions/compliance";
import Link from "next/link";

const CERT_TYPES = [
  "Electrical Safety (NFPA 70E)",
  "LOTO Authorized",
  "HAZCOM",
  "First Aid / CPR",
  "Fall Protection",
  "Aerial Lift Operator",
];

export default async function LogTrainingPage() {
  const user = await getCurrentUser();
  if (user.role === "WORKER" || user.role === "CLIENT_VIEWER") redirect("/compliance");

  const people = listUsers(user.companyId).sort((a, b) => a.lastName.localeCompare(b.lastName));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/compliance?tab=training" className="text-xs font-medium text-sidebar-accent">
          ← Back to training
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Log training</h1>
        <p className="mt-1 text-sm text-foreground/60">Record a new certification or training course completion.</p>
      </div>

      <form action={createCertificationAction} className="card space-y-4 p-5">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Team member</span>
          <select name="userId" required defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="" disabled>Choose someone…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.title}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Certification type</span>
          <select name="type" required defaultValue="" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="" disabled>Select course…</option>
            {CERT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Issued on</span>
            <input type="date" name="issuedOn" required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Expires on</span>
            <input type="date" name="expiresOn" required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent" />
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-white">
            Log training
          </button>
        </div>
      </form>
    </div>
  );
}
