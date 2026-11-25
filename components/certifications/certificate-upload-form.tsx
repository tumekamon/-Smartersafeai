"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { submitCertificationAction } from "@/lib/actions/certifications";
import { CERTIFICATION_TYPES, CERT_FILE_MAX_BYTES, formatBytes } from "@/lib/certifications";
import { IconCamera } from "@/components/ui/icons";
import { toJpeg } from "@/lib/client-image";

type Picked = { file: File; previewUrl?: string; isPdf: boolean };

const shrink = (file: File) => toJpeg(file, { maxBytes: CERT_FILE_MAX_BYTES * 0.9, name: "certificate.jpg" });

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

  // Laid out as the design canvas's "Add a certificate" (W13): one big drop box, the
  // details, then "Send for checking" pinned to the bottom.
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />

      {picked ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {picked.isPdf ? (
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#B42318] font-mono text-xs font-medium text-white">PDF</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{picked.file.name}</span>
                <span className="block text-[13px] text-body">{formatBytes(picked.file.size)}</span>
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picked.previewUrl} alt="Certificate preview" className="max-h-72 w-full bg-black object-contain" />
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2">
            <span className="text-[13px] text-body">{picked.isPdf ? "PDF document" : `Photo · ${formatBytes(picked.file.size)}`}</span>
            <button type="button" onClick={() => setPicked(null)} className="min-h-10 text-sm font-medium text-brand">
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={preparing}
            className="flex h-[168px] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-foreground/30 bg-surface text-[15px] font-medium text-brand"
          >
            {preparing ? (
              <span aria-hidden="true" className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <IconCamera width={28} height={28} strokeWidth={1.7} />
            )}
            {preparing ? "Preparing photo…" : "Photo of the card, or a PDF"}
            <span className="text-[13px] font-normal text-body">Up to {formatBytes(CERT_FILE_MAX_BYTES)}</span>
          </button>
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={preparing} className="self-center min-h-11 text-sm font-medium text-brand">
            Use the camera instead
          </button>
        </div>
      )}
      {fileError && <p className="text-sm font-medium tone-critical">{fileError}</p>}

      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">Type</span>
        <select name="type" required value={type} onChange={(e) => setType(e.target.value)} className="ds-field">
          <option value="" disabled>
            Choose…
          </option>
          {CERTIFICATION_TYPES.map((c) => (
            <option key={c.type} value={c.type}>
              {c.type}
              {onFile[c.type] ? " (renewal)" : ""}
            </option>
          ))}
        </select>
        {renewing && <span className="text-[13px] text-body">You have one on file until {onFile[type]}. This replaces it once it&apos;s accepted.</span>}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-[15px] font-medium">Issued</span>
          <input name="issuedOn" type="date" required max={today} className="ds-field" />
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-[15px] font-medium">Expires</span>
          <input name="expiresOn" type="date" required min={today} className="ds-field" />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">
          Issued by <span className="font-normal text-body">(optional)</span>
        </span>
        <input name="issuer" maxLength={80} placeholder="e.g. American Red Cross" className="ds-field" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">
          Certificate number <span className="font-normal text-body">(optional)</span>
        </span>
        <input name="certificateNo" maxLength={40} autoComplete="off" className="ds-field" />
      </label>

      <label className="flex min-h-12 items-start gap-3 text-[15px]">
        <input name="confirm" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]" />
        <span>This is my own certificate and the details above match it.</span>
      </label>

      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}

      <footer className="ds-foot">
        <button type="submit" disabled={pending || preparing} className="ds-btn ds-btn-primary w-full">
          {pending ? "Sending…" : "Send for checking"}
        </button>
        <span className="ds-foot-hint">Your supervisor checks it against the document. It counts once accepted.</span>
      </footer>
    </form>
  );
}
