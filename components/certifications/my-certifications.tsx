import Link from "next/link";
import type { Certification } from "@/lib/types";
import { certificationSlots, type CertificationSlot } from "@/lib/certifications";
import { certStatus } from "@/lib/metrics";
import { withdrawCertificationAction } from "@/lib/actions/certifications";

const DAY = 86_400_000;

/** Certificate dates are calendar days: always with the year, never shifted by time zone. */
const day = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: iso.length === 10 ? "UTC" : undefined,
  });

const uploadHref = (type: string) => `/settings/profile/certifications/new?type=${encodeURIComponent(type)}`;

/** One certificate as a flat row (design canvas W12): name, one line of dates, a status tag. */
function Slot({ slot, now }: { slot: CertificationSlot; now: number }) {
  const { current, pending, rejected, type } = slot;
  const status = current ? certStatus(current.expiresOn, now) : undefined;
  const days = current ? Math.round((Date.parse(current.expiresOn) - now) / DAY) : 0;

  const tag = pending
    ? { label: "Being checked", cls: "ds-tag-info" }
    : status === "expired"
      ? { label: "Expired", cls: "ds-tag-crit" }
      : status === "expiring"
        ? { label: `${days} ${days === 1 ? "day" : "days"}`, cls: "ds-tag-warn" }
        : status === "current"
          ? { label: "Current", cls: "ds-tag-good" }
          : { label: "Not accepted", cls: "ds-tag-crit" };

  const line = pending
    ? `${current ? "Renewal sent" : "Uploaded"} ${day(pending.submittedAt!)} · valid to ${day(pending.expiresOn)}`
    : current
      ? `${status === "expired" ? "Expired" : "Expires"} ${day(current.expiresOn)}`
      : rejected?.reviewNote
        ? `“${rejected.reviewNote}”`
        : "Upload it again";
  const needsUpload = !pending && (status === "expired" || status === "expiring" || (!current && rejected));
  const doc = (pending ?? current)?.document ? (pending ?? current) : undefined;

  return (
    <li className="ds-row">
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-base font-semibold">{type}</span>
        <span className="text-sm text-body">{line}</span>
        {(needsUpload || doc || pending) && (
          <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
            {needsUpload && (
              <Link href={uploadHref(type)} className="text-brand hover:underline">
                {current ? "Upload the renewal" : "Upload again"}
              </Link>
            )}
            {doc && (
              <a href={`/certificates/${doc.id}/file`} target="_blank" rel="noopener" className="text-brand hover:underline">
                View {doc.document!.mimeType === "application/pdf" ? "PDF" : "photo"}
              </a>
            )}
            {pending && (
              <form action={withdrawCertificationAction}>
                <input type="hidden" name="certificationId" value={pending.id} />
                <button type="submit" className="text-body hover:underline">
                  Withdraw
                </button>
              </form>
            )}
          </span>
        )}
      </span>
      <span className={`ds-tag ${tag.cls} shrink-0 self-start`}>{tag.label}</span>
    </li>
  );
}

/**
 * The person's own certificates (design canvas W12, "01 / My certificates"). Each counts
 * only once verified; uploads being checked and ones turned down show alongside.
 */
export function MyCertifications({ records, now, justSent }: { records: Certification[]; now: number; justSent?: boolean }) {
  const slots = certificationSlots(records);
  const held = slots.filter((s) => s.current || s.pending || s.rejected);
  const missing = slots.filter((s) => !s.current && !s.pending && !s.rejected);

  return (
    <section id="certs" aria-labelledby="certs-head" className="flex scroll-mt-20 flex-col">
      <div className="ds-sec">
        <h2 id="certs-head" className="eyebrow" style={{ color: "var(--foreground)" }}>
          01 / My certificates
        </h2>
        <span className="eyebrow">{held.length}</span>
      </div>

      {justSent && (
        <p role="status" className="ds-note mt-4 text-[15px]">
          <span className="eyebrow" style={{ color: "var(--brand)" }}>
            Sent
          </span>
          Your supervisor checks it. It counts once it&apos;s accepted.
        </p>
      )}

      {held.length === 0 ? (
        <p className="ds-row text-[15px] text-body">No certificates on file yet. Add your training cards so you can be put on the right work.</p>
      ) : (
        <ul>
          {held.map((s) => (
            <Slot key={s.type} slot={s} now={now} />
          ))}
        </ul>
      )}

      {missing.length > 0 && (
        <ul>
          {missing.map((s) => (
            <li key={s.type} className="ds-row">
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-base font-semibold">{s.type}</span>
                <span className="truncate text-sm text-body">Not on file · {s.covers}</span>
              </span>
              <Link href={uploadHref(s.type)} className="shrink-0 text-sm font-medium text-brand hover:underline">
                Add
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/settings/profile/certifications/new" className="ds-btn ds-btn-outline mt-4 min-h-12 text-[15px]">
        Add a certificate
      </Link>
    </section>
  );
}
