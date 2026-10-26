import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { listProjects, listUsers } from "@/lib/db";
import { TeamRoster } from "@/components/settings/team-roster";
import { InviteUserForm } from "@/components/settings/invite-user-form";

export default async function TeamSettingsPage() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) redirect("/dashboard");

  const members = listUsers(user.companyId).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const projects = listProjects(user.companyId);
  const sitesByUser = Object.fromEntries(
    members.map((m) => [m.id, projects.filter((p) => p.crewIds.includes(m.id)).map((p) => ({ id: p.id, name: p.shortName }))])
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-foreground/60">{members.length} people on this workspace.</p>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Invite someone</h2>
        <InviteUserForm />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5"><h2 className="text-sm font-semibold">Everyone</h2></div>
        <TeamRoster members={members} currentUserId={user.id} sitesByUser={sitesByUser} />
        <p className="border-t border-border px-5 py-3 text-xs text-foreground/55">
          Sites come from each project&apos;s Crew tab. Supervisors and workers only see the sites they&apos;re on.
        </p>
      </section>
    </div>
  );
}
