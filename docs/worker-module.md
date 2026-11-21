# Worker module: reports, notifications, emergency, offline

Contract for the supervisor / safety-manager side. Nothing here requires changes on your side; the
"you can" notes are optional hooks.

## My reports (`/my-reports`)
`lib/my-reports.ts → myReports(user)`: the hazards (field findings whose inspection `inspectorId` is the
user) and incidents (`reportedById`) the person reported, on sites they are still on. Stage comes from data
you already write:

| Stage | From |
|---|---|
| Waiting for review | `finding.reviewerDecision === "pending"` |
| Confirmed | approved / overridden, no task yet |
| Being fixed / Fixed | `finding.correctiveActionId` task: open/completed vs verified/closed |
| Reviewed, no fix needed | `rejected`; **`overrideReason` is shown to the worker**, so write it for them |

Hazard reports are filed by `fileHazardReport(user, formData)` in `lib/hazard-report.ts` (the old
`submitHazardReport` server action is gone). Workers land on `/my-reports?sent=<findingId>`; others still on
`/inspections/<id>?reported=1`.

## Notifications (`/notifications`, bell in the top bar for workers)
`lib/notifications.ts → noticesFor(user)` works them out from records, so **there is nothing to "send"**:
new / sent-back / approved / overdue / due-today tasks, check-in review, certificate review and expiry,
and review or fix of their own reports. Read state: `store.inboxSeen[userId]` (set when the list is opened).
Phone push isn't built yet; it would need VAPID keys and a push subscription per device.

## Emergency (`/emergency`, red strip on My Day)
New optional `Project.emergency` (`lib/types.ts → SiteEmergency`): `sitePhone`, `siteAddress`, `musterPoint`,
`firstAidStation`, `hospital { name, address, phone? }`. **You can** add these fields to the project edit
form; until then they come from the seed. First aiders = site crew with a current verified First Aid / CPR
certificate (`lib/emergency.ts`). 911 is always shown.

## Offline
- `public/sw.js`: build assets served from the phone; My Day, Emergency, Report a hazard, My tasks and the
  worker's task pages, My reports and Notifications are kept from the last visit (network first). Other pages
  show `public/offline.html`. Kept pages are wiped on the login page and when a different user signs in.
- `lib/outbox.ts` (IndexedDB): hazard reports and "mark fixed" are saved on the phone first, then posted to
  `POST /api/outbox/{hazard|task}` (same rules as before; same-origin only; `clientId` makes resends safe).
  `components/offline/outbox-sync.tsx` sends what's waiting when the signal is back and shows a status bar.
- Check-in stays online-only on purpose (live photo + location are verified at receive time).
