import Link from "next/link";
import type { Certification } from "@/lib/types";
import { certificationSlots, type CertificationSlot } from "@/lib/certifications";
import { certStatus } from "@/lib/metrics";
import { withdrawCertificationAction } from "@/lib/actions/certifications";
import { IconCheck, IconClock, IconEye, IconFileCheck, IconPlus, IconX } from "@/components/ui/icons";

const DAY = 86_400_000;

/** Certificate dates are calendar days: always with the year, never shifted by time zone. */
const day = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: iso.length === 10 ? "UTC" : undefined,
  });

type Tone = "good" | "warning" | "critical" | "info" | "neutral";
const TONE_VAR: Record<Tone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  info: "var(--sidebar-accent)",
  neutral: "var(--border)",
};

function validity(c: Certification, now: number): { tone: Tone; label: string } {
  const s = certStatus(c.expiresOn, now);
  const days = Math.round((Date.parse(c.expiresOn) - now) / DAY);
  if (s === "expired") return { tone: "critical", label: `Expired ${Math.abs(days)}d ago` };
  if (s === "expiring") return { tone: "warning", label: `${days}d left` };
  return { tone: "good", label: "Valid" };
}

function DocLink({ cert }: { cert: Certification }) {
  if (!cert.document) return <span className="text-xs text-foreground/45">Logged by your company</span>;
  return (
    <a
      href={`/certificates/${cert.id}/file`}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-sidebar-accent hover:bg-surface-muted"
    >
      <IconEye width={15} height={15} /> View {cert.document.mimeType === "application/pdf" ? "PDF" : "photo"}
    </a>
  );
}

function Slot({ slot, now }: { slot: CertificationSlot; now: number }) {
  const { current, pending, rejected, type } = slot;
  const v = current ? validity(current, now) : null;
  const tone: Tone = v?.tone ?? (pending ? "info" : "critical");
  const needsRenewal = !!v && v.tone !== "good" && !pending;
  const upload = `/settings/profile/certifications/new?type=${encodeURIComponent(type)}`;

  return (
    <li className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: TONE_VAR[tone] }} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{type}</p>
            {current ? (
              <p className="mt-0.5 text-xs text-foreground/55">
                {day(current.issuedOn)} – {day(current.expiresOn)}
                {current.issuer && ` · ${current.issuer}`}
                {current.certificateNo && ` · No. ${current.certificateNo}`}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-foreground/55">{slot.covers}</p>
            )}
          </div>
          {v ? (
            <span className={`badge shrink-0 badge-${v.tone}`}>{v.label}</span>
          ) : pending ? (
            <span className="badge badge-info shrink-0">In review</span>
          ) : null}
        </div>

        {current && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <DocLink cert={current} />
            {needsRenewal && (
              <Link href={upload} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-sm font-bold text-background">
                Upload renewal
              </Link>
            )}
          </div>
        )}

        {pending && (
          <div className="mt-3 rounded-xl bg-surface-muted px-3 py-2.5 text-sm">
            <p className="flex items-start gap-2">
              <IconClock width={16} height={16} className="mt-0.5 shrink-0 text-sidebar-accent" />
              <span>
                <span className="font-semibold">{current ? "Renewal sent" : "Sent"} {day(pending.submittedAt!)}</span>
                <span className="block text-foreground/60">Valid to {day(pending.expiresOn)} · waiting for your supervisor to check it</span>
              </span>
            </p>
            <span className="mt-1.5 flex items-center gap-1 pl-5">
              <DocLink cert={pending} />
              <form action={withdrawCertificationAction}>
                <input type="hidden" name="certificationId" value={pending.id} />
                <button type="submit" className="min-h-9 rounded-lg px-2 text-sm font-semibold text-foreground/60 hover:bg-surface">
                  Withdraw
                </button>
              </form>
            </span>
          </div>
        )}

        {!pending && rejected && (
          <div className="mt-3 rounded-xl border border-status-critical/25 bg-status-critical/5 px-3 py-2.5 text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-status-critical">
              <IconX width={14} height={14} /> Not accepted
            </p>
            {rejected.reviewNote && <p className="mt-0.5 text-foreground/75">&ldquo;{rejected.reviewNote}&rdquo;</p>}
            <Link href={upload} className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-foreground px-3 text-sm font-bold text-background">
              Upload again
            </Link>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * The person's own certificates, on their profile. Everything counts only once
 * verified; uploads waiting for review and ones turned down are shown alongside.
 */
export function MyCertifications({ records, now, justSent }: { records: Certification[]; now: number; justSent?: boolean }) {
  const slots = certificationSlots(records);
  const held = slots.filter((s) => s.current || s.pending || s.rejected);
  const missing = slots.filter((s) => !s.current && !s.pending && !s.rejected);
  const counts = {
    valid: slots.filter((s) => s.current && certStatus(s.current.expiresOn, now) === "current").length,
    due: slots.filter((s) => s.current && certStatus(s.current.expiresOn, now) !== "current").length,
    review: slots.filter((s) => s.pending).length,
  };

  return (
    <section id="certs" className="scroll-mt-20 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">My certifications</h2>
          <p className="mt-0.5 text-sm text-foreground/60">Your training cards. Each upload is checked by your supervisor before it counts.</p>
        </div>
        <Link
          href="/settings/profile/certifications/new"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-sidebar-accent px-4 text-sm font-bold text-white"
        >
          <IconPlus width={16} height={16} strokeWidth={2.4} /> Add certificate
        </Link>
      </div>

      {justSent && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-status-good/10 px-4 py-3 text-sm font-semibold text-status-good">
          <IconCheck width={16} height={16} strokeWidth={2.6} /> Sent. Your supervisor will check it and it&apos;ll show as valid once accepted.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { n: counts.valid, label: "Valid", color: "var(--status-good)" },
          { n: counts.due, label: "Due / expired", color: counts.due ? "var(--status-critical)" : undefined },
          { n: counts.review, label: "In review", color: counts.review ? "var(--sidebar-accent)" : undefined },
        ].map((t) => (
          <div key={t.label} className="card px-3 py-2.5">
            <p className="text-2xl font-black tabular-nums" style={t.color ? { color: t.color } : undefined}>{t.n}</p>
            <p className="text-xs font-medium text-foreground/55">{t.label}</p>
          </div>
        ))}
      </div>

      {held.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <IconFileCheck width={28} height={28} className="text-foreground/40" />
          <p className="font-semibold">No certificates on file yet</p>
          <p className="text-sm text-foreground/55">Add your training cards so your supervisor can put you on the right work.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {held.map((s) => (
            <Slot key={s.type} slot={s} now={now} />
          ))}
        </ul>
      )}

      {missing.length > 0 && (
        <div className="card p-4">
          <p className="eyebrow mb-2">Not on file</p>
          <ul className="divide-y divide-border">
            {missing.map((s) => (
              <li key={s.type} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{s.type}</span>
                  <span className="block truncate text-xs text-foreground/50">{s.covers}</span>
                </span>
                <Link
                  href={`/settings/profile/certifications/new?type=${encodeURIComponent(s.type)}`}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-sidebar-accent hover:bg-surface-muted"
                >
                  <IconPlus width={14} height={14} /> Add
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
