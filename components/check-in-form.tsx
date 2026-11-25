"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { submitCheckIn } from "@/lib/actions/check-in";
import { MAX_GPS_ACCURACY_M, distanceMeters, formatDistance } from "@/lib/check-in";
import type { Geofence } from "@/lib/types";
import { IconCamera, IconCheck, IconMapPin } from "@/components/ui/icons";

type Site = { id: string; shortName: string; geofence?: Geofence };
type Fix = { lat: number; lng: number; accuracy: number };
type Shot = { file: File; url: string; takenAt: number };

/**
 * Start-of-day check-in. The photo can only come from the live camera stream: there
 * is no file picker, so an old photo from the gallery can't be sent. The location is
 * read from the phone's GPS and checked again on the server against the site boundary.
 */
export function CheckInForm({ sites, ppe, workerName }: { sites: Site[]; ppe: string[]; workerName: string }) {
  const [state, action, pending] = useActionState(submitCheckIn, undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [chosenSiteId, setChosenSiteId] = useState<string | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  // Live camera, only while no photo is held.
  useEffect(() => {
    if (shot) return;
    let cancelled = false;
    const open = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("insecure");
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
    };
    open()
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
      })
      .catch((e: Error) =>
        setCameraError(
          e.message === "insecure"
            ? "The camera needs a secure (https) connection. Ask your admin for the https link."
            : "Camera blocked. Allow camera access for this site in your browser settings, then reload."
        )
      );
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [facing, shot, stopCamera]);

  // GPS: keep the most accurate fix seen.
  useEffect(() => {
    // Every phone browser has geolocation; on plain http it fails as "permission denied".
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsError(null);
        setFix((prev) =>
          !prev || p.coords.accuracy <= prev.accuracy
            ? { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }
            : prev
        );
      },
      (e) =>
        setGpsError(
          e.code === e.PERMISSION_DENIED
            ? "Location blocked. Allow location for this site in your browser settings (it also needs https), then reload."
            : "Can't get your location yet. Step outside or wait a moment."
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Nearest site with a boundary, until the worker picks one themselves.
  const nearestId = fix
    ? sites
        .filter((s) => s.geofence)
        .map((s) => ({ id: s.id, d: distanceMeters(fix, s.geofence!) }))
        .sort((a, b) => a.d - b.d)[0]?.id
    : undefined;
  const siteId = chosenSiteId ?? nearestId ?? sites[0]?.id ?? "";
  const site = sites.find((s) => s.id === siteId);
  const distance = fix && site?.geofence ? distanceMeters(fix, site.geofence) : undefined;
  const onSite = distance === undefined ? undefined : distance <= site!.geofence!.radiusM;
  const gpsGood = !!fix && fix.accuracy <= MAX_GPS_ACCURACY_M;

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    // Burn a stamp into the picture so it can't be passed off as another day or place.
    const takenAt = Date.now();
    const lines = [
      `${workerName} · ${site?.shortName ?? ""}`,
      new Date(takenAt).toLocaleString(),
      fix ? `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)} ±${Math.round(fix.accuracy)} m` : "No GPS fix",
    ];
    const size = Math.max(14, Math.round(w / 32));
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    const pad = Math.round(size * 0.6);
    const boxH = lines.length * size * 1.3 + pad * 2;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, h - boxH, w, boxH);
    ctx.fillStyle = "#fff";
    lines.forEach((line, i) => ctx.fillText(line, pad, h - boxH + pad + size * (i + 1) * 1.3 - size * 0.3));

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        setShot({ file: new File([blob], "check-in.jpg", { type: "image/jpeg" }), url: URL.createObjectURL(blob), takenAt });
      },
      "image/jpeg",
      0.82
    );
  };

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  };

  const allPpe = ppe.every((p) => ticked.includes(p));
  const canSubmit = !!shot && gpsGood && onSite !== false && allPpe && !pending;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shot || !fix) return;
    const fd = new FormData();
    fd.set("projectId", siteId);
    fd.set("photo", shot.file);
    fd.set("captureAgeMs", String(Date.now() - shot.takenAt));
    fd.set("lat", String(fix.lat));
    fd.set("lng", String(fix.lng));
    fd.set("accuracy", String(fix.accuracy));
    ticked.forEach((p) => fd.append("ppe", p));
    startTransition(() => action(fd));
  };

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 border-t-2 border-brand py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-status-good text-white">
          <IconCheck width={32} height={32} strokeWidth={2.6} />
        </span>
        <p className="disp text-[28px]">Checked in</p>
        <p className="text-[15px] text-body">Your supervisor will confirm it. Have a safe day.</p>
      </div>
    );
  }

  // Laid out as the design canvas's "PPE check-in" (W03): 01 what you're wearing,
  // 02 where you're working, then the live photo, and Check in pinned to the bottom.
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[22px]">
      <fieldset className="flex flex-col">
        <legend className="ds-sec w-full">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>01 / I&apos;m wearing</span>
          <span className="eyebrow">
            {ticked.length} of {ppe.length}
          </span>
        </legend>
        {ppe.map((item) => {
          const on = ticked.includes(item);
          return (
            <label key={item} className="flex min-h-[60px] cursor-pointer items-center gap-3.5 border-b border-border">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={on}
                onChange={() => setTicked((t) => (on ? t.filter((x) => x !== item) : [...t, item]))}
              />
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
                  on ? "border-brand bg-brand text-surface" : "border-foreground/30 bg-surface"
                }`}
              >
                {on && <IconCheck width={16} height={16} strokeWidth={3} />}
              </span>
              <span className="text-base font-medium">{item}</span>
            </label>
          );
        })}
      </fieldset>

      <section className="flex flex-col gap-3">
        <div className="ds-sec">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>02 / Where are you working</span>
        </div>
        {sites.length > 1 ? (
          <label className="flex min-h-[52px] items-center gap-3 border-b border-border">
            <span className="sr-only">Site</span>
            <select
              value={siteId}
              onChange={(e) => setChosenSiteId(e.target.value)}
              className="min-w-0 flex-1 appearance-none bg-transparent text-base font-medium outline-none"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="text-sm text-brand">
              Change
            </span>
          </label>
        ) : (
          <p className="flex min-h-[52px] items-center border-b border-border text-base font-medium">{site?.shortName}</p>
        )}
        <p className="flex items-start gap-2 text-sm font-medium">
          <IconMapPin width={16} height={16} className="mt-0.5 shrink-0" />
          {gpsError ? (
            <span className="tone-critical">{gpsError}</span>
          ) : !fix ? (
            <span className="text-body">Finding your location…</span>
          ) : !gpsGood ? (
            <span className="tone-critical">GPS is weak (±{Math.round(fix.accuracy)} m). Step outside or wait a moment.</span>
          ) : onSite === undefined ? (
            <span className="text-body">Location found (±{Math.round(fix.accuracy)} m). This site has no boundary set, so it is recorded but not checked.</span>
          ) : onSite ? (
            <span className="tone-good">You&apos;re on site at {site?.shortName}</span>
          ) : (
            <span className="tone-critical">
              You&apos;re {formatDistance(distance!)} from {site?.shortName}. You can check in once you&apos;re on site.
            </span>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="ds-sec">
          <span className="eyebrow" style={{ color: "var(--foreground)" }}>03 / Photo in your PPE</span>
          <span className="eyebrow">{shot ? "Taken" : "Live camera"}</span>
        </div>
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl bg-[#2b3340] text-white">
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="Your check-in photo" className="absolute inset-0 h-full w-full object-cover" />
          ) : cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <IconCamera width={34} height={34} strokeWidth={1.8} />
              <p className="text-[15px] font-medium">{cameraError}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedData={() => setCameraReady(true)}
              className={`absolute inset-0 h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-4">
            {shot ? (
              <button type="button" onClick={retake} className="min-h-11 rounded-full bg-black/60 px-6 font-semibold">
                Retake
              </button>
            ) : (
              !cameraError && (
                <>
                  <button
                    type="button"
                    onClick={capture}
                    disabled={!cameraReady}
                    aria-label="Take photo"
                    className="h-16 w-16 rounded-full border-4 border-white bg-white/30 disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                    className="absolute right-4 min-h-11 rounded-full bg-black/60 px-4 text-sm font-semibold"
                  >
                    Flip
                  </button>
                </>
              )
            )}
          </div>
        </div>
        {!shot && <p className="text-center text-[13px] text-body">Get head to boots in the picture so your PPE shows.</p>}
      </section>

      {state?.error && <p className="form-error">{state.error}</p>}

      <footer className="ds-foot">
        <button type="submit" disabled={!canSubmit} className="ds-btn ds-btn-primary w-full">
          {pending ? "Sending…" : "Check in"}
        </button>
        <span className="ds-foot-hint">
          {!allPpe ? "Tick everything you're wearing. Missing an item? Tell your supervisor before you start." : !shot ? "Take the photo to check in." : "Your supervisor confirms it."}
        </span>
      </footer>
    </form>
  );
}
