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
        <h1 className="text-3xl font-semibold tracking-tight">Emergency</h1>
        <CallBar />
        <NoSiteNotice action="see your site's emergency information" />
      </div>
    );
  }

  const e = site.emergency ?? {};
  const aiders = firstAiders(site).filter((u) => u.id !== user.id);
  const contacts = siteContacts(site);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="eyebrow flex items-center gap-1.5 text-status-critical">
          <IconSiren width={14} height={14} /> {site.shortName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Emergency</h1>
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
