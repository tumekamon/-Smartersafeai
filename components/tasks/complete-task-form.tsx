"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "@/lib/client-image";
import { listOutbox, newClientId, OUTBOX_EVENT, submitThroughOutbox } from "@/lib/outbox";
import { IconCamera, IconCheck, IconWifiOff, IconX } from "@/components/ui/icons";
import type { EvidenceRequirement } from "@/lib/types";

/**
 * "Mark as fixed". For a physical fix a photo of the fixed spot is required, so the
 * checker can compare it with the hazard without walking over (on a phone the button
 * opens the camera). For jobs like briefings or paperwork the photo is optional or
 * not asked for, and a note saying what was done is the proof instead.
 *
 * It's saved on the phone before it's sent: with no signal it waits in the outbox
 * (lib/outbox.ts) and sends by itself once the connection is back.
 */
export function CompleteTaskForm({
  taskId,
  taskLabel,
  userId,
  onBehalfOf,
  proof,
}: {
  taskId: string;
  taskLabel: string;
  userId: string;
  onBehalfOf?: string;
  proof: EvidenceRequirement;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const noteRequired = proof === "disabled" || (proof === "optional" && !photo);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  // Already marked fixed with no signal: show that instead of the form, until it's sent.
  const sending = useRef(false);
  const wasQueued = useRef(false);
  useEffect(() => {
    if (typeof indexedDB === "undefined") return;
    const check = () =>
      listOutbox(userId).then((items) => {
        if (sending.current) return; // this form is sending it right now
        const waiting = items.some((i) => i.kind === "task" && i.fields.correctiveActionId === taskId && !i.error);
        // It just went out from the background sync: show the task's new state.
        if (wasQueued.current && !waiting) router.refresh();
        wasQueued.current = waiting;
        setQueued(waiting);
      });
    check();
    window.addEventListener(OUTBOX_EVENT, check);
    return () => window.removeEventListener(OUTBOX_EVENT, check);
  }, [taskId, userId, router]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setPreparing(true);
    toJpeg(file, { maxEdge: 1600, name: "fixed.jpg" })
      .then((jpeg) => setPhoto({ file: jpeg, url: URL.createObjectURL(jpeg) }))
      .catch(() => setPhotoError("That photo can't be read. Try again with the camera."))
      .finally(() => setPreparing(false));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (proof === "required" && !photo) return setPhotoError("Take a photo of the fixed spot first.");
    setPending(true);
    setError(null);
    sending.current = true;
    try {
      const result = await submitThroughOutbox({
        clientId: newClientId(),
        userId,
        kind: "task",
        label: `Fix: ${taskLabel}`,
        createdAt: new Date().toISOString(),
        fields: { correctiveActionId: taskId, note },
        files: photo ? [{ field: "photo", name: "fixed.jpg", blob: photo.file }] : [],
      });
      if (result.status === "sent") {
        router.push(result.next ?? `/corrective-actions/${taskId}?done=1`);
        router.refresh();
        return;
      }
      if (result.status === "rejected") setError(result.error);
      else {
        wasQueued.current = true;
        setQueued(true);
      }
    } catch {
      setError("This phone couldn't save it. Check your signal and try again.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  };

  if (queued) {
    return (
      <div className="space-y-2 rounded-2xl border border-status-warning/40 bg-status-warning/10 p-4">
        <p className="flex items-center gap-2 font-bold">
          <IconWifiOff width={18} height={18} /> Saved on your phone
        </p>
        <p className="text-sm text-foreground/70">No signal right now. Your fix will send by itself as soon as there is, and your supervisor will check it then.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="correctiveActionId" value={taskId} />
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />

      {proof === "disabled" ? null : photo ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="Photo of the fix" className="max-h-72 w-full bg-black object-contain" />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-status-good">
              <IconCheck width={14} height={14} strokeWidth={2.6} /> Photo added
            </span>
            <button type="button" onClick={() => setPhoto(null)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-foreground/65 hover:bg-surface-muted">
              <IconX width={14} height={14} /> Retake
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={preparing}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors ${
            proof === "required"
              ? "min-h-32 border-sidebar-accent/40 bg-sidebar-accent/5 text-sidebar-accent hover:bg-sidebar-accent/10"
              : "min-h-20 border-border text-foreground/70 hover:bg-surface-muted"
          }`}
        >
          {preparing ? (
            <span aria-hidden="true" className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <IconCamera width={28} height={28} />
          )}
          <span className="text-[15px] font-bold">
            {preparing ? "Preparing photo…" : proof === "required" ? "Take a photo of the fix" : "Add a photo (optional)"}
          </span>
          {proof === "required" && <span className="text-xs font-medium text-foreground/50">Show the same spot, now safe</span>}
        </button>
      )}
      {photoError && <p className="text-sm font-medium text-status-critical">{photoError}</p>}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-foreground/80">
          What did you do? {!noteRequired && <span className="font-normal text-foreground/45">(optional)</span>}
        </span>
        <textarea
          name="note"
          rows={3}
          maxLength={500}
          required={noteRequired}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            proof === "required"
              ? "e.g. Moved the cable reel to the laydown area and taped off the panel front."
              : "e.g. Briefed 8 crew members at the 7:00 toolbox talk and handed out vests."
          }
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-sidebar-accent focus:ring-2 focus:ring-sidebar-accent/20"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-status-critical/30 bg-status-critical/10 px-3.5 py-2.5 text-sm font-medium text-status-critical">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || preparing || (proof === "required" ? !photo : noteRequired && !note.trim())}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-status-good text-[15px] font-bold text-white disabled:opacity-60"
      >
        <IconCheck width={18} height={18} strokeWidth={2.6} />
        {pending ? "Sending…" : onBehalfOf ? `Mark fixed for ${onBehalfOf}` : "Mark as fixed"}
      </button>
    </form>
  );
}
