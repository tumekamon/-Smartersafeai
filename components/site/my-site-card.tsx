import Link from "next/link";
import { switchSiteAction } from "@/lib/actions/site";
import type { Project } from "@/lib/types";
import { activePermits, levelRange, siteContacts } from "@/lib/site";
import { Avatar } from "@/components/ui/avatar";
import { IconArrowRight, IconFileCheck, IconLayers, IconMail, IconMapPin, IconPhone, IconUsers } from "@/components/ui/icons";

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * The worker's site at a glance: where it is, who to call, and what permits are in
 * force. When the worker is on more than one active site, tabs across the top switch
 * between them (the choice rides in the URL, so it survives a reload).
 */
export function MySiteCard({
  project,
  sites,
  now,
  switchHref = () => "/dashboard",
  showDetailsLink = true,
}: {
  project: Project;
  /** All of the worker's active sites; tabs show only when there are two or more. */
  sites: Pick<Project, "id" | "shortName">[];
  now: number;
  /** Where to land after switching to a site from its tab. */
  switchHref?: (siteId: string) => string;
  showDetailsLink?: boolean;
}) {
  const contacts = siteContacts(project);
  const permits = activePermits(project, now);

  return (
    <section className="hero @container overflow-hidden" aria-labelledby="my-site-title">
      {sites.length > 1 && (
        <nav aria-label="Switch site" className="flex gap-1 overflow-x-auto border-b border-hero-tile-border p-1.5">
          {sites.map((s) => {
            const on = s.id === project.id;
            return (
              <form key={s.id} action={switchSiteAction} className="shrink-0">
                <input type="hidden" name="projectId" value={s.id} />
                <input type="hidden" name="redirectTo" value={switchHref(s.id)} />
                <button
                  type="submit"
                  aria-current={on ? "page" : undefined}
                  disabled={on}
                  className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                    on ? "bg-hero-fg" : "hero-muted hover:bg-hero-tile-hover"
                  }`}
                  style={on ? { color: "var(--hero-from)" } : undefined}
                >
                  {on && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />}
                  {s.shortName}
                </button>
              </form>
            );
          })}
        </nav>
      )}

      <div className="p-4 @md:p-5 @2xl:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="hero-muted text-[11px] font-semibold uppercase tracking-[0.12em]">
              Your site{sites.length > 1 ? ` · ${sites.findIndex((s) => s.id === project.id) + 1} of ${sites.length}` : ""}
            </p>
            <h2 id="my-site-title" className="disp mt-1 text-[22px] leading-tight @2xl:text-[28px]">
              {project.shortName}
            </h2>
            <p className="hero-muted mt-1 flex items-center gap-1.5 text-sm">
              <IconMapPin width={14} height={14} className="shrink-0" />
              <span className="truncate">
                {project.location} · {project.projectNumber}
              </span>
            </p>
          </div>
          {showDetailsLink && (
            <Link
              href={`/projects/${project.id}`}
              className="hero-tile hero-tile-hover flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold"
            >
              Details
              <IconArrowRight width={15} height={15} />
            </Link>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          <Fact Icon={IconLayers} label="Levels" value={levelRange(project)} />
          <Fact Icon={IconMapPin} label="Zones" value={String(project.zones.length)} />
          <Fact Icon={IconUsers} label="Crew" value={String(project.crewIds.length)} />
        </dl>

        {/* Container query: two columns only when the card itself is wide (full page), not in the side column. */}
        <div className="mt-5 grid gap-5 @2xl:grid-cols-2 @2xl:gap-6">
          <div>
            <h3 className="hero-muted mb-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
              {contacts[0]?.role === "Safety manager" ? "Contact" : contacts.length > 1 ? "Your supervisors" : "Your supervisor"}
            </h3>
            {contacts.length === 0 ? (
              <p className="hero-muted text-sm">No one assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {contacts.map(({ user, role }) => (
                  <li key={user.id} className="hero-tile flex items-center gap-3 rounded-xl p-2.5">
                    <Avatar person={user} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="hero-muted block truncate text-xs">
                        {role === "Safety manager" ? role : user.title}
                      </span>
                    </span>
                    {user.phone && (
                      <a
                        href={`tel:${user.phone.replace(/[^\d+]/g, "")}`}
                        aria-label={`Call ${user.firstName}`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-status-good text-white"
                      >
                        <IconPhone width={18} height={18} strokeWidth={2} />
                      </a>
                    )}
                    <a
                      href={`mailto:${user.email}`}
                      aria-label={`Email ${user.firstName}`}
                      className="hero-tile hero-tile-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    >
                      <IconMail width={18} height={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="hero-muted mb-2 text-[11px] font-semibold uppercase tracking-[0.12em]">Active permits</h3>
            {permits.length === 0 ? (
              <p className="hero-tile hero-muted flex min-h-[60px] items-center gap-2 rounded-xl px-3 text-sm">
                <IconFileCheck width={16} height={16} />
                No permits in force right now
              </p>
            ) : (
              <ul className="space-y-2">
                {permits.slice(0, 3).map((p) => (
                  <li key={p.id} className="hero-tile flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <span aria-hidden="true" className="h-8 w-1 shrink-0 rounded-full bg-status-warning" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.type}</span>
                      <span className="hero-muted block truncate text-xs">
                        {p.location.level} {p.location.zone}
                      </span>
                    </span>
                    <span className="hero-muted shrink-0 text-xs font-medium">until {clock(p.expiresAt)}</span>
                  </li>
                ))}
                {permits.length > 3 && <li className="hero-muted px-1 text-xs">+{permits.length - 3} more</li>}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ Icon, label, value }: { Icon: typeof IconLayers; label: string; value: string }) {
  return (
    <div className="hero-tile rounded-xl px-3 py-2.5">
      <dt className="hero-muted flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider">
        <Icon width={12} height={12} />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-base font-bold">{value}</dd>
    </div>
  );
}
