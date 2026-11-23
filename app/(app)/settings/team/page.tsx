import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { listProjects, listUsers } from "@/lib/db";
import { ROLE_INFO } from "@/lib/roles";
import { TeamRoster } from "@/components/settings/team-roster";
import { InviteUserForm } from "@/components/settings/invite-user-form";

/** Team (design AP3 / A03): invite on top, everyone by level below. */
export default async function TeamSettingsPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) redirect("/dashboard");
  const { site } = await searchParams;

  const members = listUsers(user.companyId)
    .filter((m) => !m.readOnly)
    .sort((a, b) => ROLE_INFO[a.role].level - ROLE_INFO[b.role].level || a.lastName.localeCompare(b.lastName));
  const projects = listProjects(user.companyId);
  const sites = projects.filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.shortName }));
  const sitesByUser = Object.fromEntries(
    members.map((m) => [m.id, projects.filter((p) => p.crewIds.includes(m.id)).map((p) => ({ id: p.id, name: p.shortName }))])
  );
  const newSite = site ? sites.find((s) => s.id === site) : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">{members.length} people · 4 levels</span>
        <h1 className="disp text-[38px] leading-none">Team</h1>
      </div>

      {newSite && (
        <p className="rounded-xl bg-tint px-4 py-3 text-[15px] text-ink">
          <strong>{newSite.name}</strong> is set up. Invite its crew below, or add people who are already on the team from the site&apos;s Crew tab.
        </p>
      )}

      <InviteUserForm sites={sites} defaultSite={newSite?.id} />

      <section className="flex flex-col">
        <div className="section-rule"><span className="eyebrow text-foreground">Everyone</span></div>
        <div className="card overflow-hidden">
          <TeamRoster members={members} currentUserId={user.id} sitesByUser={sitesByUser} />
        </div>
        <p className="mt-2 text-[13px] text-body">
          Supervisors and workers only see the sites they&apos;re on. Change a level or give someone an extra right from their row.
        </p>
      </section>
    </div>
  );
}
