# Worker certificate uploads: contract for the supervisor / safety manager side

Workers (and supervisors) upload their own training certificates under **My profile → My certifications**
(`/settings/profile#certs`, form at `/settings/profile/certifications/new`). An upload only counts once
someone at L1–L3 has accepted it. The worker side is done; the review screen is yours to build.

## Data

`Certification` in `lib/types.ts` gained:

| Field | Meaning |
|---|---|
| `review` | `"pending"` (uploaded, not checked) · `"verified"` · `"rejected"`. **Missing = verified** (logged by a manager or seeded). Use `certReview(c)` from `lib/certifications.ts`, never read the field directly. |
| `document` | `{ fileName, mimeType, sizeBytes, dataUrl, capturedAt }`: JPEG/PNG/WebP/PDF, ≤ 4 MB. Type is sniffed from the bytes on the server. |
| `certificateNo`, `issuer` | Optional, typed by the worker. |
| `submittedById`, `submittedAt` | Set on upload. |
| `reviewedById`, `reviewedAt`, `reviewNote` | Set by the review action. |

## Reading

- `listCertifications(companyId)`: **only what counts**: verified, one per person and type (the
  longest-running). Every existing compliance figure uses this, so pending uploads never inflate it,
  and an accepted renewal replaces the old card automatically.
- `listCertificationRecords(companyId, { userId? })`: everything, including pending and rejected.
  For a review queue: `listCertificationRecords(companyId).filter(c => certReview(c) === "pending")`,
  then keep only people in `peopleFor(reviewer)` (a supervisor sees only their own sites' crews).
- The file: `GET /certificates/<id>/file` (`<img src>` or a link with `target="_blank"`). It returns the
  owner's file, or the file of a person on one of the reviewer's sites; anyone else gets a 404.
  Don't put `document.dataUrl` in a page; it can be 4 MB.

## Writing

`reviewCertificationAction(formData)` in `lib/actions/certifications.ts`:

| Field | Value |
|---|---|
| `certificationId` | the record id |
| `decision` | `"verified"` or `"rejected"` |
| `note` | required when rejecting (the worker sees it, e.g. "Photo is blurry, the expiry date can't be read") |

It returns `{ error?: string }`. It already enforces: L1–L3 (or the "Manage compliance" extra), the
person is on the reviewer's sites, not their own upload, and only `pending` records.

## What the reviewer should check

Name on the document matches the worker, the type is right, and the issue and expiry dates match
what was typed. If they don't, reject it with a note saying which one.

## Worker-side rules (already enforced)

- One pending upload per type; the worker can withdraw it until it's reviewed.
- Expired certificates, future issue dates, and expiry before issue are refused.
- A new upload must run longer than the one already on file.
