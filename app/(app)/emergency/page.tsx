import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { moduleVisible } from "@/lib/home-layout";
import { accessibleProject, sitesFor } from "@/lib/scope";
import { usesWorkingSite, workingSite } from "@/lib/site-focus";
import { siteContacts } from "@/lib/site";
import { firstAiders, mapsHref, telHref } from "@/lib/emergency";
import { Avatar } from "@/components/ui/avatar";
import { NoSiteNotice } from "@/components/site/no-site-notice";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconChevronLeft,
  IconNavigate,
  IconFirstAid,
  IconFlag,
  IconHospital,
  IconMapPin,
  IconPhone,
  IconSiren,
} from "@/components/ui/icons";

/**
 * What to do when something goes wrong on site, for the site the worker is on:
 * 911 and the site line, who's first-aid trained, where to gather, the nearest ER,
 * and how to stop work. Kept on the phone so it opens even with no signal.
 */
export default async function EmergencyPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const user = await getCurrentUser();
  const { site: siteParam } = await searchParams;
  const site = usesWorkingSite(user)
    ? await workingSite(user)
    : accessibleProject(user, siteParam) ?? sitesFor(user).find((p) => p.status === "active");
  const canReport = !getCapabilities(user).isReadOnly;
  const incidents = moduleVisible(getCompany(user.companyId), user, "incidents");

  if (!site) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="disp text-[28px] leading-tight sm:text-3xl lg:text-4xl">Emergency</h1>
        <CallBar />
        <NoSiteNotice action="see your site's emergency information" />
      </div>
    );
  }

  const e = site.emergency ?? {};
  const aiders = firstAiders(site).filter((u) => u.id !== user.id);
  const contacts = siteContacts(site);

  // A worker gets the dark, phone-first emergency screen from the design canvas (W11).
  if (usesWorkingSite(user)) {
    const caller = contacts.find((c) => c.user.phone)?.user;
    const line = "border-b border-[#DCEBF7]/15";
    return (
      <div className="-mx-4 -mb-8 -mt-5 flex min-h-[100dvh] flex-col gap-6 bg-[#0B1F33] px-6 pb-7 pt-6 text-[#F4F7FA] sm:-mx-6 lg:mx-auto lg:my-0 lg:min-h-0 lg:max-w-xl lg:rounded-2xl lg:p-8">
        <Link href="/dashboard" className="ds-back self-start" style={{ color: "#DCEBF7" }}>
          <IconChevronLeft width={18} height={18} /> Back
        </Link>
        <header className="flex flex-col gap-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#F7A29B]">{site.shortName} · works offline</span>
          <h1 className="disp text-[44px] leading-none">Emergency</h1>
        </header>

        <div className="flex flex-col gap-2.5">
          <a href="tel:911" className="ds-btn min-h-[60px] gap-2.5 bg-[#D92D20] text-lg text-white">
            <IconPhone width={22} height={22} strokeWidth={2} /> Call 911
          </a>
          {e.sitePhone && (
            <a href={telHref(e.sitePhone)} className="ds-btn min-h-[60px] border-[1.5px] border-[#DCEBF7]/50 text-lg text-white">
              Site line · {e.sitePhone}
            </a>
          )}
        </div>

        <dl className="flex flex-col">
          {e.siteAddress && (
            <div className={`flex flex-col gap-1 py-4 ${line}`}>
              <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#9DB6D3]">Tell the dispatcher</dt>
              <dd className="text-base font-medium">{e.siteAddress}</dd>
            </div>
          )}
          <div className={`flex flex-col gap-1 py-4 ${line}`}>
            <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#9DB6D3]">Muster point</dt>
            <dd className="text-base font-medium">{e.musterPoint ?? "Not set yet. Ask your supervisor where to gather."}</dd>
          </div>
          <div className={`flex items-center gap-3.5 py-4 ${line}`}>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#9DB6D3]">Nearest ER</dt>
              <dd className="text-base font-medium">{e.hospital?.name ?? "Not set yet. Call 911; they send help."}</dd>
              {e.hospital && <dd className="text-sm text-[#C9DAEC]">{e.hospital.address}</dd>}
            </div>
            {e.hospital?.phone && (
              <a href={telHref(e.hospital.phone)} aria-label="Call the ER" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#DCEBF7]/40">
                <IconPhone width={18} height={18} strokeWidth={2} />
              </a>
            )}
            {e.hospital && (
              <a href={mapsHref(e.hospital.address)} target="_blank" rel="noreferrer" aria-label="Directions to the ER" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#DCEBF7]/40">
                <IconNavigate width={18} height={18} />
              </a>
            )}
          </div>
          <div className="flex flex-col gap-1 py-4">
            <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#9DB6D3]">First aid</dt>
            <dd className="text-base font-medium">{e.firstAidStation ?? "Ask your supervisor where the kit is."}</dd>
            {aiders.length === 0 ? (
              <dd className="text-sm text-[#C9DAEC]">No one on this crew has a current First Aid certificate on file.</dd>
            ) : (
              aiders.slice(0, 4).map((u) => (
                <dd key={u.id} className="flex min-h-12 items-center gap-3">
                  <span className="flex-1 text-sm text-[#C9DAEC]">
                    <span className="font-medium text-white">{u.firstName} {u.lastName}</span> · first aider
                  </span>
                  {u.phone && (
                    <a href={telHref(u.phone)} aria-label={`Call ${u.firstName}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#DCEBF7]/40">
                      <IconPhone width={17} height={17} strokeWidth={2} />
                    </a>
                  )}
                </dd>
              ))
            )}
          </div>
        </dl>

        {/* Stop work: the four steps, and who to call. */}
        <section aria-labelledby="stop-head" className="flex flex-col gap-3">
          <h2 id="stop-head" className="border-b-2 border-[#F7A29B] pb-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#F7A29B]">
            Stop work
          </h2>
          <ol className="flex flex-col gap-2.5">
            {[
              ["Stop", "Stop the job and warn the people around you."],
              ["Make it safe", "Only if you can without putting yourself at risk."],
              ["Call your supervisor", "Tell them what you saw and where."],
              ["Report it", "So it gets fixed and doesn't happen again."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#DCEBF7]/50 font-mono text-[11px]">{i + 1}</span>
                <span className="text-[15px]">
                  <span className="font-medium text-white">{t}.</span> <span className="text-[#C9DAEC]">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          {contacts
            .filter((c) => c.user.phone)
            .slice(0, 2)
            .map(({ user: c, role }) => (
              <div key={c.id} className="flex min-h-14 items-center gap-3 border-b border-[#DCEBF7]/15">
                <span className="flex-1 text-sm text-[#C9DAEC]">
                  <span className="font-medium text-white">
                    {c.firstName} {c.lastName}
                  </span>{" "}
                  · {role.toLowerCase()}
                </span>
                <a href={telHref(c.phone!)} aria-label={`Call ${c.firstName}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#DCEBF7]/40">
                  <IconPhone width={17} height={17} strokeWidth={2} />
                </a>
              </div>
            ))}
        </section>

        <div className="mt-auto flex flex-col gap-2.5">
          {caller?.phone && (
            <a href={telHref(caller.phone)} className="ds-btn ds-btn-yellow min-h-[60px] text-lg">
              Stop work · call {caller.firstName}
            </a>
          )}
          <p className="text-center text-[13px] text-[#C9DAEC]">Anyone can stop work that isn&apos;t safe. You will never be in trouble for it.</p>
          {canReport && (
            <Link href={incidents ? "/incidents/new" : `/hazards/new?project=${site.id}`} className="flex min-h-11 items-center justify-center text-[15px] font-medium text-[#DCEBF7]">
              {incidents ? "Report an incident instead" : "Report a hazard instead"}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="eyebrow flex items-center gap-1.5 text-status-critical">
          <IconSiren width={14} height={14} /> {site.shortName}
        </p>
        <h1 className="mt-1 disp text-[28px] leading-tight sm:text-3xl lg:text-4xl">Emergency</h1>
      </header>

      <CallBar sitePhone={e.sitePhone} />

      {e.siteAddress && (
        <section className="card flex flex-wrap items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-foreground/70">
            <IconMapPin width={20} height={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold uppercase tracking-wider text-foreground/50">Tell the dispatcher</span>
            <span className="block text-[17px] font-bold leading-snug">{e.siteAddress}</span>
          </span>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="aiders">
          <h2 id="aiders" className="flex items-center gap-2 text-base font-bold">
            <IconFirstAid width={19} height={19} className="text-status-critical" /> First aiders on this site
          </h2>
          <p className="mt-0.5 text-xs text-foreground/55">Crew with a current First Aid / CPR certificate.</p>
          {aiders.length === 0 ? (
            <p className="mt-3 rounded-xl bg-surface-muted px-3 py-3 text-sm text-foreground/65">No one on this crew has a current certificate on file. Call 911 and your supervisor.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {aiders.slice(0, 6).map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl bg-surface-muted/60 p-2.5">
                  <Avatar person={u} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{u.firstName} {u.lastName}</span>
                    <span className="block truncate text-xs text-foreground/55">{u.title}</span>
                  </span>
                  {u.phone && <CallButton phone={u.phone} label={`Call ${u.firstName}`} />}
                </li>
              ))}
              {aiders.length > 6 && <li className="px-1 text-xs text-foreground/55">+{aiders.length - 6} more on this crew</li>}
            </ul>
          )}
          {e.firstAidStation && (
            <p className="mt-3 rounded-xl border border-border px-3 py-2.5 text-sm">
              <span className="font-bold">First-aid kit &amp; AED:</span> {e.firstAidStation}
            </p>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-5" aria-labelledby="muster">
            <h2 id="muster" className="flex items-center gap-2 text-base font-bold">
              <IconFlag width={19} height={19} className="text-status-good" /> Muster point
            </h2>
            <p className="mt-2 text-[17px] font-semibold leading-snug">{e.musterPoint ?? "Not set yet. Ask your supervisor where to gather."}</p>
            <p className="mt-1 text-xs text-foreground/55">If the alarm sounds, leave by the nearest safe exit and gather here. Don&apos;t go back in until you&apos;re told.</p>
          </section>

          <section className="card p-5" aria-labelledby="hospital">
            <h2 id="hospital" className="flex items-center gap-2 text-base font-bold">
              <IconHospital width={19} height={19} className="text-sidebar-accent" /> Nearest emergency room
            </h2>
            {e.hospital ? (
              <>
                <p className="mt-2 text-[17px] font-semibold leading-snug">{e.hospital.name}</p>
                <p className="text-sm text-foreground/60">{e.hospital.address}</p>
                <div className="mt-3 flex gap-2">
                  <a href={mapsHref(e.hospital.address)} target="_blank" rel="noreferrer" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-muted text-sm font-bold">
                    <IconMapPin width={16} height={16} /> Directions
                  </a>
                  {e.hospital.phone && (
                    <a href={telHref(e.hospital.phone)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-muted text-sm font-bold">
                      <IconPhone width={16} height={16} /> Call ER
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-foreground/60">Not set yet. In an emergency call 911; they will send help.</p>
            )}
          </section>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border-2 border-status-critical/40" aria-labelledby="stop-work">
        <div className="bg-status-critical px-5 py-4 text-white">
          <h2 id="stop-work" className="flex items-center gap-2 text-lg font-extrabold">
            <IconAlertTriangle width={22} height={22} strokeWidth={2.2} /> Stop work
          </h2>
          <p className="text-sm text-white/90">Anyone can stop work that isn&apos;t safe. You will never be in trouble for it.</p>
        </div>
        <div className="grid gap-5 bg-surface p-5 md:grid-cols-2">
          <ol className="space-y-3">
            {[
              ["Stop", "Stop the job and warn the people around you."],
              ["Make it safe", "Only if you can do it without putting yourself at risk. Keep people away."],
              ["Call your supervisor", "Tell them what you saw and where."],
              ["Report it", "So it gets fixed and doesn't happen again."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-black text-background">{i + 1}</span>
                <span>
                  <span className="block font-bold">{t}</span>
                  <span className="block text-sm text-foreground/60">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="space-y-2.5">
            {contacts.slice(0, 2).map(({ user: c, role }) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-surface-muted/60 p-2.5">
                <Avatar person={c} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{c.firstName} {c.lastName}</span>
                  <span className="block truncate text-xs text-foreground/55">{role}</span>
                </span>
                {c.phone && <CallButton phone={c.phone} label={`Call ${c.firstName}`} />}
              </div>
            ))}
            {canReport && (
              <div className={`grid gap-2 pt-1 ${incidents ? "grid-cols-2" : ""}`}>
                <Link href={`/hazards/new?project=${site.id}`} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-[#c2410c] px-3 text-sm font-bold text-white">
                  Report hazard <IconArrowRight width={15} height={15} />
                </Link>
                {incidents && <Link href="/incidents/new" className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 text-sm font-bold text-background">
                  Report injury <IconArrowRight width={15} height={15} />
                </Link>}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CallBar({ sitePhone }: { sitePhone?: string }) {
  return (
    <div className={`grid gap-2.5 ${sitePhone ? "sm:grid-cols-2" : ""}`}>
      <a href="tel:911" className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-status-critical text-2xl font-black text-white shadow-lg shadow-status-critical/25">
        <IconPhone width={28} height={28} strokeWidth={2.2} /> Call 911
      </a>
      {sitePhone && (
        <a href={telHref(sitePhone)} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border-2 border-status-critical/40 bg-surface text-status-critical">
          <span className="flex items-center gap-2 text-lg font-extrabold">
            <IconPhone width={20} height={20} strokeWidth={2.2} /> Site emergency line
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground/60">{sitePhone}</span>
        </a>
      )}
    </div>
  );
}

function CallButton({ phone, label }: { phone: string; label: string }) {
  return (
    <a href={telHref(phone)} aria-label={label} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-status-good text-white">
      <IconPhone width={18} height={18} strokeWidth={2} />
    </a>
  );
}
