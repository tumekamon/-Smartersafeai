# Daily check-in (worker PPE photo)

Every morning a **worker (L4)** checks in before starting work: a live-camera photo of
themselves in their PPE, taken **on site**. A **supervisor (L3)** for that site, or a
**safety manager / admin (L1/L2)**, then approves or rejects it.

The worker side is built. This note is the contract for whoever builds the
supervisor and safety-manager screens.

## Flow

```
Worker opens My Day ──► "Check in for today" ──► /check-in
   live camera photo + GPS + PPE ticks ──► submitCheckIn()  ──► CheckIn { status: "pending" }
                                                                       │
Supervisor / Safety manager screen (TO BUILD) ──► reviewCheckInAction() ┤
                                                                       ├─► "approved"  → worker sees "Checked in"
                                                                       └─► "rejected" + note → worker sees the note
                                                                                         and can check in again
```

## Data (`lib/types.ts` → `CheckIn`)

| Field | Meaning |
|---|---|
| `userId`, `projectId`, `day` | Who, which site, which day (`YYYY-MM-DD`, server time) |
| `photo.dataUrl` | The JPEG. It has a burned-in stamp: name, site, time, GPS |
| `capturedAt` / `submittedAt` | When the photo was taken / sent (server-derived) |
| `position` | `{ lat, lng, accuracyM }` from the phone |
| `distanceM`, `locationCheck` | Metres from the site centre; `"inside"` or `"no_boundary"` (site has no boundary set) |
| `ppeConfirmed` | PPE items the worker ticked (`CHECK_IN_PPE` in `lib/check-in.ts`) |
| `status` | `pending` → `approved` \| `rejected` |
| `reviewedById`, `reviewedAt`, `reviewNote` | Set by the review; the note is shown to the worker |

A worker can have several check-ins on one day only if earlier ones were rejected. The
**latest** one counts (`getCheckInForDay`).

## Functions to use (don't touch `store` directly)

Reads, from `lib/db.ts`:

```ts
listCheckIns(companyId, { day?, projectId?, userId?, status? })   // newest first
getCheckIn(id)
getCheckInForDay(companyId, userId, day)
```

Today's date key: `checkInDay(Date.now())` from `lib/check-in.ts`.

Write, from `lib/actions/check-in.ts`. It's a server action that you can use as a `<form action>`:

```tsx
<form action={reviewCheckInAction}>
  <input type="hidden" name="checkInId" value={c.id} />
  <input name="note" />                       {/* required when rejecting */}
  <button name="decision" value="approved">Approve</button>
  <button name="decision" value="rejected">Reject</button>
</form>
```

It enforces:
- The reviewer has `canReviewCheckIns` (L1, L2, L3).
- The check-in is on one of the reviewer's sites (`siteIdsFor`).
- Nobody reviews their own check-in.
- A rejection needs a note.

Show or hide your UI with `getCapabilities(user).canReviewCheckIns`.

## Suggested screens (to build)

1. **Supervisor: "Today's check-ins" per site.** Use the crew list (`project.crewIds`, keep only the
   `WORKER` users) against `listCheckIns(companyId, { day, projectId })`. That gives three groups:
   - **Waiting:** pending check-ins, each with the photo, PPE list, time and distance, and Approve / Reject buttons.
   - **Not checked in:** crew members with no check-in today. This is the important list.
   - **Approved / rejected.**
2. **Safety manager:** the same view across all sites, plus a count on the dashboard
   ("12/14 checked in, 2 waiting").
3. **Optional:** a badge on the Work tab for pending check-ins (`components/work-tabs.tsx`).

## Rules enforced on the server (`submitCheckIn`)

- Only workers (`mustCheckIn`) can check in, once a day. They can try again after a rejection.
- The site must be active and one of the worker's sites.
- The photo must be a JPEG of 4 MB or less, sent within 3 minutes of being taken.
- GPS accuracy must be 100 m or better. If the site has a boundary, the worker must be inside its radius.
- Every PPE item must be ticked.

## Limits

These are deterrents, not proof.
- **Camera only.** The page has no file picker and only uses the live camera. But a web app
  can't fully prove where a picture came from: a rooted phone, a virtual camera app or a fake-GPS
  app can get round it. The burned-in stamp and the supervisor's look at the photo are the real
  check. A native app with device attestation would be needed for more.
- **HTTPS.** Camera and GPS only work over HTTPS or on `localhost`. To test on a phone, run
  `pnpm dev --experimental-https` or deploy.
- **Storage.** Photos are stored inline as data URLs in memory, like the other evidence. Move them
  to object storage when the real database lands.
