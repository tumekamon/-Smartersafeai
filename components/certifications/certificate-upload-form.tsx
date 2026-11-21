"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitCertificationAction } from "@/lib/actions/certifications";
import { CERTIFICATION_TYPES, CERT_FILE_MAX_BYTES, formatBytes } from "@/lib/certifications";
import { IconCamera, IconFileText, IconX } from "@/components/ui/icons";
import { toJpeg } from "@/lib/client-image";

type Picked = { file: File; previewUrl?: string; isPdf: boolean };

const shrink = (file: File) => toJpeg(file, { maxBytes: CERT_FILE_MAX_BYTES * 0.9, name: "certificate.jpg" });

const inputCls =
  "w-full min-h-12 rounded-xl border border-border bg-surface px-3.5 text-[15px] outline-none focus:border-sidebar-accent focus:ring-2 focus:ring-sidebar-accent/20";

export function CertificateUploadForm({
  defaultType,
  onFile,
  today,
}: {
  defaultType?: string;
  /** Types already on file, with their expiry, to label renewals. */
  onFile: Record<string, string>;
  today: string;
}) {
  const [state, action, pending] = useActionState(submitCertificationAction, undefined);
  const [type, setType] = useState(defaultType ?? "");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (picked?.previewUrl) URL.revokeObjectURL(picked.previewUrl);
  }, [picked]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError(null);
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      if (file.size > CERT_FILE_MAX_BYTES) return setFileError("That PDF is larger than 4 MB. Take a photo of the certificate instead.");
      return setPicked({ file, isPdf: true });
    }
    setPreparing(true);
    shrink(file)
      .then((jpeg) => setPicked({ file: jpeg, previewUrl: URL.createObjectURL(jpeg), isPdf: false }))
      .catch(() => setFileError("This image can't be read. Take a photo instead, or save it as JPG or PDF."))
      .finally(() => setPreparing(false));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!picked) return setFileError("Add a photo or PDF of the certificate.");
    const fd = new FormData(e.currentTarget);
    fd.set("document", picked.file);
    startTransition(() => action(fd));
  };

  const renewing = type && onFile[type];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* 1. Document */}
      <section className="card p-5">
        <p className="eyebrow mb-1">Step 1</p>
        <h2 className="text-base font-bold">The certificate</h2>
        <p className="mt-1 text-sm text-foreground/60">A clear photo of the card or certificate, or the PDF your training provider sent you.</p>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />

        {picked ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            {picked.isPdf ? (
              <div className="flex items-center gap-3 bg-surface-muted p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#b91c1c] text-xs font-black text-white">PDF</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{picked.file.name}</span>
                  <span className="block text-xs text-foreground/55">{formatBytes(picked.file.size)}</span>
                </span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picked.previewUrl} alt="Certificate preview" className="max-h-80 w-full bg-black object-contain" />
            )}
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
              <span className="text-xs text-foreground/55">{picked.isPdf ? "PDF document" : `Photo · ${formatBytes(picked.file.size)}`}</span>
              <button type="button" onClick={() => setPicked(null)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-foreground/70 hover:bg-surface-muted">
                <IconX width={14} height={14} /> Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={preparing}
              className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-sidebar-accent/40 bg-sidebar-accent/5 text-sm font-bold text-sidebar-accent transition-colors hover:bg-sidebar-accent/10"
            >
              {preparing ? (
                <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <IconCamera width={24} height={24} />
              )}
              {preparing ? "Preparing photo…" : "Take a photo"}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={preparing}
              className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border text-sm font-bold text-foreground/70 transition-colors hover:bg-surface-muted"
            >
              <IconFileText width={24} height={24} />
              Choose a file
              <span className="text-[11px] font-medium text-foreground/45">Photo or PDF, up to 4 MB</span>
            </button>
          </div>
        )}
        {fileError && <p className="mt-3 text-sm font-medium text-status-critical">{fileError}</p>}
        {!picked && (
          <p className="mt-3 text-xs text-foreground/50">Tip: lay the card flat in good light so the name, dates and number can be read.</p>
        )}
      </section>

      {/* 2. Details */}
      <section className="card space-y-4 p-5">
        <div>
          <p className="eyebrow mb-1">Step 2</p>
          <h2 className="text-base font-bold">Details from the certificate</h2>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-foreground/80">Certificate type</span>
          <select name="type" required value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            <option value="" disabled>Choose…</option>
            {CERTIFICATION_TYPES.map((c) => (
              <option key={c.type} value={c.type}>
                {c.type}
                {onFile[c.type] ? " (renewal)" : ""}
              </option>
            ))}
          </select>
          {type && (
            <span className="mt-1.5 block text-xs text-foreground/55">
              {CERTIFICATION_TYPES.find((c) => c.type === type)?.covers}.
              {renewing && <> You have one on file until {onFile[type]}; this will replace it once it&apos;s accepted.</>}
            </span>
          )}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Issued on</span>
            <input name="issuedOn" type="date" required max={today} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">Expires on</span>
            <input name="expiresOn" type="date" required min={today} className={inputCls} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">
              Certificate number <span className="font-normal text-foreground/45">(optional)</span>
            </span>
            <input name="certificateNo" maxLength={40} autoComplete="off" className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-foreground/80">
              Issued by <span className="font-normal text-foreground/45">(optional)</span>
            </span>
            <input name="issuer" maxLength={80} placeholder="e.g. Red Cross, NECA" className={inputCls} />
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3.5 text-sm">
          <input name="confirm" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--sidebar-accent)]" />
          <span>This is my own certificate and the details above match it.</span>
        </label>
      </section>

      {state?.error && (
        <p role="alert" className="rounded-xl border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm font-medium text-status-critical">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Link href="/settings/profile#certs" className="flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold text-foreground/70 hover:bg-surface-muted">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending || preparing}
          className="min-h-12 rounded-xl bg-sidebar-accent px-6 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send for review"}
        </button>
      </div>
      <p className="text-center text-xs text-foreground/50 sm:text-right">
        Your supervisor checks it against the document. It counts as valid once accepted.
      </p>
    </form>
  );
}
