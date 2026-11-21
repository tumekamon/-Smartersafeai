"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createCheckIn, getCheckIn, getCheckInForDay, getProject, reviewCheckIn } from "@/lib/db";
import { siteIdsFor, sitesFor } from "@/lib/scope";
import { stripJpegMetadata } from "@/lib/evidence";
import {
  CHECK_IN_PPE,
  MAX_CAPTURE_AGE_MS,
  MAX_GPS_ACCURACY_M,
  checkInDay,
  distanceMeters,
  formatDistance,
} from "@/lib/check-in";

export type CheckInState = { error?: string; ok?: boolean } | undefined;

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * Worker's start-of-day check-in. The phone only offers the live camera, but the
 * server re-checks everything it can: one check-in a day, a fresh JPEG, a usable
 * GPS fix, and a position inside the site boundary.
 */
export async function submitCheckIn(_state: CheckInState, formData: FormData): Promise<CheckInState> {
  const user = await getCurrentUser();
  if (!getCapabilities(user).mustCheckIn) return { error: "Your account doesn't do daily check-ins." };

  const receivedAt = Date.now();
  const day = checkInDay(receivedAt);
  const existing = getCheckInForDay(user.companyId, user.id, day);
  if (existing && existing.status !== "rejected") return { error: "You've already checked in today." };

  const project = getProject(String(formData.get("projectId") ?? ""));
  if (!project || project.status !== "active" || !sitesFor(user).some((p) => p.id === project.id)) {
    return { error: "Pick the site you're working on today." };
  }

  // Photo: must be a JPEG the page just made from the camera.
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Take your check-in photo first." };
  if (photo.size > MAX_PHOTO_BYTES) return { error: "The photo is too large. Take it again." };
  const raw = Buffer.from(await photo.arrayBuffer());
  if (raw[0] !== 0xff || raw[1] !== 0xd8) return { error: "That photo can't be used. Take it again with the camera." };

  // How long ago the phone says the photo was taken. Measured on the phone as elapsed
  // time, so a wrong phone clock doesn't matter.
  const ageMs = Number(formData.get("captureAgeMs"));
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_CAPTURE_AGE_MS) {
    return { error: "The photo is more than 3 minutes old. Take a new one." };
  }

  // Location
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const accuracyM = Number(formData.get("accuracy"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Your location is missing. Turn on location and try again." };
  }
  if (!Number.isFinite(accuracyM) || accuracyM <= 0 || accuracyM > MAX_GPS_ACCURACY_M) {
    return { error: `Your GPS signal isn't accurate enough (±${Math.round(accuracyM) || "?"} m). Step outside or wait a moment, then try again.` };
  }
  const position = { lat, lng, accuracyM: Math.round(accuracyM) };

  let distanceM: number | undefined;
  if (project.geofence) {
    distanceM = Math.round(distanceMeters(position, project.geofence));
    if (distanceM > project.geofence.radiusM) {
      return { error: `You're ${formatDistance(distanceM)} from ${project.shortName}. Check in when you're on site.` };
    }
  }

  // PPE: every listed item must be confirmed.
  const ppe = formData.getAll("ppe").map(String);
  const missing = CHECK_IN_PPE.filter((item) => !ppe.includes(item));
  if (missing.length) return { error: `Confirm you're wearing: ${missing.join(", ")}.` };

  const capturedAt = new Date(receivedAt - ageMs).toISOString();
  createCheckIn({
    companyId: user.companyId,
    userId: user.id,
    projectId: project.id,
    day,
    photo: {
      id: `ev_ci_${receivedAt}`,
      fileName: "check-in.jpg",
      dataUrl: `data:image/jpeg;base64,${stripJpegMetadata(raw).toString("base64")}`,
      capturedAt,
    },
    capturedAt,
    submittedAt: new Date(receivedAt).toISOString(),
    position,
    distanceM,
    locationCheck: project.geofence ? "inside" : "no_boundary",
    ppeConfirmed: CHECK_IN_PPE.filter((item) => ppe.includes(item)),
  });

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Supervisor / safety manager decision on a check-in. Supervisors can only review
 * check-ins on their own sites; a rejection needs a reason the worker will see.
 * Form fields: checkInId, decision ("approved" | "rejected"), note.
 */
export async function reviewCheckInAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canReviewCheckIns) throw new Error("Your role cannot review check-ins.");

  const checkIn = getCheckIn(String(formData.get("checkInId") ?? ""));
  if (!checkIn || checkIn.companyId !== user.companyId) throw new Error("Check-in not found.");
  if (!siteIdsFor(user).has(checkIn.projectId)) throw new Error("That check-in is for a site you don't cover.");
  if (checkIn.userId === user.id) throw new Error("You can't review your own check-in.");

  const decision = String(formData.get("decision") ?? "");
  if (decision !== "approved" && decision !== "rejected") throw new Error("Approve or reject the check-in.");
  const note = String(formData.get("note") ?? "").trim();
  if (decision === "rejected" && !note) throw new Error("Say why, so the worker knows what to fix.");

  reviewCheckIn(checkIn.id, { status: decision, reviewedById: user.id, reviewNote: note || undefined });
  revalidatePath("/check-in");
  revalidatePath("/dashboard");
}
