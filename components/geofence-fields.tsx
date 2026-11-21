"use client";

import { useRef, useState } from "react";
import type { Geofence } from "@/lib/types";
import { DEFAULT_SITE_RADIUS_M } from "@/lib/check-in";
import { IconMapPin } from "@/components/ui/icons";

/**
 * Site boundary for the daily check-in. Easiest done standing on site: "Use my
 * location" fills the centre from the phone's GPS. Leave blank to not enforce it.
 */
export function GeofenceFields({ geofence }: { geofence?: Geofence }) {
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setStatus("This device can't share its location.");
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (latRef.current) latRef.current.value = p.coords.latitude.toFixed(6);
        if (lngRef.current) lngRef.current.value = p.coords.longitude.toFixed(6);
        setStatus(`Set from your location (±${Math.round(p.coords.accuracy)} m). Save to keep it.`);
      },
      () => setStatus("Location blocked or unavailable (it needs https)."),
      { enableHighAccuracy: true, timeout: 20_000 }
    );
  };

  const input = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-sidebar-accent";
  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-medium text-foreground/80">Check-in boundary</legend>
      <p className="text-xs text-foreground/55">Workers can only do their daily check-in inside this circle. Leave blank to record location without checking it.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-foreground/70">Latitude</span>
          <input ref={latRef} name="geofenceLat" inputMode="decimal" defaultValue={geofence?.lat ?? ""} className={input} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-foreground/70">Longitude</span>
          <input ref={lngRef} name="geofenceLng" inputMode="decimal" defaultValue={geofence?.lng ?? ""} className={input} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-foreground/70">Radius (m)</span>
          <input name="geofenceRadius" type="number" min={50} max={2000} defaultValue={geofence?.radiusM ?? DEFAULT_SITE_RADIUS_M} className={input} />
        </label>
      </div>
      <button type="button" onClick={useMyLocation} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold">
        <IconMapPin width={16} height={16} />
        Use my location
      </button>
      {status && <p className="text-xs text-foreground/60">{status}</p>}
    </fieldset>
  );
}
