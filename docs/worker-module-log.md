# Worker module (L4): work log

**Date:** 21 November 2026
**Branch:** `worker-module` (from `main` at `03e73ae`)
**Scope:** the field worker (L4) only. The supervisor and safety-manager side is being built by another developer.
Where worker features need something from that side, it is listed under [Handoff](#7-handoff-to-the-supervisor--safety-manager-developer).

Contracts for the other developer, one per feature:
[daily-check-in.md](daily-check-in.md) · [certifications.md](certifications.md) · [tasks.md](tasks.md) · [worker-module.md](worker-module.md)

---

## 1. Ground rules we worked to

1. **Worker module only.** Supervisor screens were touched only for access fixes or to support a worker feature (see [section 6](#6-changes-outside-the-worker-screens)).
2. **Strict access.**
   - A worker never sees another company's data, and never learns that other projects exist.
   - Only crew members of a site can report on it or see its data.
   - Anything outside a person's reach reads as "not found" (404), never "forbidden", so IDs don't leak.
3. **Built for the field.** Big tap targets, one-handed use, photos taken with the back camera, and pages that work on phones and desktops.
4. **Simulated backend.** Data is in memory and reseeds on restart (`lib/seed.ts`; store key `__smartsafeStoreV8`). Nothing here assumes a real database yet.

---

## 2. Where the worker module stands

The worker's menu is **My Day · My Tasks · Reports · More**.

| Feature | Where | Status |
|---|---|---|
| Daily check-in (live PPE selfie + site location) | My Day → `/check-in` | Done (earlier session) |
| My site card (supervisors to call, crew, active permits, switching sites) | My Day, site page | Done (earlier session) |
| Working site: every worker screen shows one site at a time | Site switcher in the top bar | Done (earlier session) |
| **Certifications: upload, review status, expiry** | My profile → `#certs` | **Done today** |
| **My tasks: redesigned list and task page, mark fixed with proof, sent-back loop** | My Tasks, `/corrective-actions/<id>` | **Done today** |
| **Photo optional for assigned jobs** | Task page | **Done today** |
| **My reports: follow every hazard and incident you reported** | Reports tab, `/my-reports` | **Done today** |
| **Notifications: bell and list** | Top bar, `/notifications` | **Done today** |
| **Emergency screen and stop work** | My Day strip, `/emergency` | **Done today** |
| **Works with poor or no signal** | Whole app | **Done today** |
| **Compliance tab removed for workers** | Menu | **Done today** |

---

## 3. What we built today, in order

### 3.1 Certifications under My profile

**Why it matters:** certificates decide what work a person may do (electrical, LOTO, heights, lifts). Expired or missing ones are a legal and insurance risk. Workers are the ones holding the cards, so they should upload them, and safety checks them.

**What the worker gets** (`/settings/profile#certs`):
- One card per certificate type, showing *Valid*, *Expires in N days*, *Expired*, *In review* or *Not accepted* (with the reviewer's reason). Plus a "Not on file" list.
- **Upload in two steps:**
  1. Take a photo or choose a file (JPEG, PNG, WebP or PDF, up to 4 MB).
  2. Enter the type, issue and expiry dates, certificate number and issuer, and tick a box confirming it is genuine.
- **Renew** an existing certificate, or **withdraw** an upload that is still in review.
- The **Certs due** tile on My Day links here. My Day shows "Renewal in review" when a renewal is waiting.

**Rules** (enforced on the server, `lib/actions/certifications.ts`):
- Expired certificates are refused.
- Only one upload per type can be in review at a time.
- A renewal must expire later than the certificate on file.
- The file's real type is read from its bytes, not its name.
- Location and device data are stripped from photos.

**Review states:**
- An upload starts as *pending*. Only *verified* certificates count toward compliance.
- Records with no review state (logged by a manager, or seeded) count as verified.
- `effectiveCertifications()` keeps one certificate per person and type: the verified one that runs longest.

**Privacy:** the file (`/certificates/<id>/file`) opens only for its owner, or for a reviewer whose sites the owner works on. Anyone else gets a 404. It is never cached and is served with `nosniff`.

**Main files:**
- `lib/certifications.ts`
- `lib/actions/certifications.ts`
- `app/certificates/[certId]/file/route.ts`
- `components/certifications/*`
- `app/(app)/settings/profile/certifications/new/page.tsx`

### 3.2 My tasks, redesigned

**How tasks work** (a task is a `CorrectiveAction`):

```
open ──(worker: proof)──▶ completed ──(L3+: approve)──▶ verified ──(L1/L2: close)──▶ closed
  ▲                           │
  └────(L3+: send back + reason)
```

Three kinds of task, labelled in plain words:

| Kind | Label | Comes from |
|---|---|---|
| `finding` | Hazard fix | A hazard confirmed in review (from an inspection or a worker's report) |
| `infraction` | Equipment check | A failed pre-use equipment checklist item |
| `manual` | Assigned job | A supervisor assigning work directly |

Priority sets the due window: critical 1 day, high 3 days, medium 7 days, low 14 days.

**The task list** (`/corrective-actions` for a worker):
- **Header:** the site name, plus counts for Overdue, Due in 7 days and Being checked.
- **Tabs:** To do, Being checked, and Done (last 30 days).
- **To do is grouped** as *Sent back to you*, *Overdue*, *Due today*, *This week* and *Later*.
- **Side panel:** "Stuck on a task?" with supervisor call buttons, and on desktop, "How a task works".

**The task page** (`/corrective-actions/<id>`):
- **Header:** priority, kind, title, where, due date, who gave the task, and the fix window.
- **Progress:** each step with its date.
- **Sent back:** a banner with the checker's reason.
- **The fix:** the photo and/or note that was sent as proof.
- **Why this task:** the original hazard photo and explanation.
- **Questions:** a call button for whoever gave the task.
- **On phones**, the action card comes first.

**The loop works:** marking a task fixed requires proof. A supervisor can approve it or send it back with a reason; the worker sees the reason, fixes it again, and resends. Marking done without proof is no longer possible anywhere.

**Access:** `visibleTask()` in `lib/task-access.ts`. The task must be on one of the user's sites, and a plain worker sees only tasks assigned to them. In testing, Kevin could open only his own 15 tasks out of 200.

### 3.3 Photo optional for assigned jobs

Not every task can be photographed (for example "book a refresher course" or "brief the crew").

- `photoProof(task)` = the task's `proof` setting if one was chosen. Otherwise a photo is **required** for hazard fixes and equipment checks, and **optional** for assigned jobs.
- If no photo is sent, **a note saying what was done is required**.
- The form adapts:
  - **Photo required:** a large camera button, and Submit stays disabled until there is a photo.
  - **Photo optional:** a small "Add a photo (optional)" button.
  - **Photo not needed:** just the note.

### 3.4 Gap analysis

We listed what a worker still lacked. We built the four must-haves (3.5 to 3.8) and kept the rest for later ([section 8](#8-not-done-yet--next-steps)).

### 3.5 My reports (Reports tab, `/my-reports`)

**Why:** people stop reporting hazards when reports disappear into a void. Seeing "your report was confirmed" and "it's fixed" is what keeps them reporting.

- **Lists** every hazard and incident the worker reported, on sites they are still on, newest first.
- **Tabs:** All, In progress and Finished.
- **Each hazard shows its stage:** *Waiting for review* → *Confirmed* → *Being fixed* → *Fixed*, or *Reviewed, no fix needed*. A turned-down report shows the reviewer's reason.
- **Opening a report** shows a timeline (who reviewed it and when, who was given the fix and the due date, when it was fixed and checked), plus the photo and the worker's own words.
- **Incidents** show Reported → Being looked into → Closed, plus what was done right away.
- **Header:** "N hazards you reported are fixed. Thanks for speaking up."
- After sending a hazard report, a worker lands here with a "Report sent" banner and the new report opened.
- **Privacy:** only the worker's own reports, and nothing from a site they have left.

Files: `lib/my-reports.ts` and `app/(app)/my-reports/page.tsx`.

### 3.6 Notifications (bell in the top bar, `/notifications`)

**What triggers one:**

| Area | Notifications |
|---|---|
| Tasks | New task (not one you gave yourself) · Sent back (with the reason) · Fix approved · Overdue · Due today |
| Check-in | Not accepted (with the reason) · Approved (today only) |
| Certificates | Accepted · Not accepted (with the reason) · Expires in N days (from 30 days out) · Expired |
| My reports | Confirmed · Reviewed, no fix needed (with the reason) · The hazard you reported is fixed · Incident closed |

**How it works:**
- Notifications are **worked out from existing records** (`lib/notifications.ts`). No screen has to "send" one, so the other developer's screens produce notifications automatically when they approve, send back or review something.
- The list covers the last 30 days, the user's own sites only, and at most 60 items.
- **Unread count:** anything newer than the last time the worker opened the list (`store.inboxSeen`). On a first sign-in, only the last 3 days count as new.
- **The list** is grouped New, Today and Earlier. Each item links to the right page. Opening the list clears the bell right away.
- The bell shows for workers only.

**Not built:** push notifications to a phone when the app is closed. This needs push keys and a subscription per phone.

### 3.7 Emergency (`/emergency`, plus a red strip on My Day and the site page)

- **One-tap call buttons:** **Call 911** and the **site emergency line**, plus the **address to give the 911 dispatcher**.
- **First aiders on site:** crew with a current, verified First Aid / CPR certificate, worked out from the certificate uploads in 3.1. Call buttons show where a phone number is on file.
- **First-aid kit and defibrillator (AED) location**, and the **muster point** with what to do when the alarm sounds.
- **Nearest emergency room:** name, address, directions and a call button.
- **Stop work:** "Anyone can stop work that isn't safe." Four steps, supervisor call buttons, and Report hazard / Report injury buttons. The incident button is hidden if the admin has switched incidents off.

New optional site field `Project.emergency`:
- `sitePhone`, `siteAddress`, `musterPoint`, `firstAidStation`
- `hospital { name, address, phone? }`

It is filled from seed data for now. Files: `lib/emergency.ts`, `app/(app)/emergency/page.tsx` and `components/site/emergency-strip.tsx`.

### 3.8 Works with poor or no signal

Basements and concrete cores often have no signal. Before this, a report typed there was lost.

**Outbox on the phone** (`lib/outbox.ts`, stored in IndexedDB):
- Hazard reports and "Mark fixed" are **saved on the phone first, then sent**.
- **No signal:** the form shows "Saved on your phone", and the item sends by itself later. Sending is tried:
  - on load
  - when the signal returns
  - when the app is reopened
  - every minute
  - when the worker taps "Send now"
- **A bar** shows "No signal", "N waiting to send", or "Couldn't send: <reason>" with a remove button.
- **Rules unchanged:** items go to `POST /api/outbox/{hazard|task}`, which applies exactly the same checks as before. The shared logic is in `lib/hazard-report.ts` and `lib/task-complete.ts`.
- **Endpoint protections:**
  - same-origin requests only
  - signed-in users only
  - each item carries a `clientId`, so a resend never files twice
  - an item that is mid-send can't be filed twice either
- Items belong to the person who made them and are only sent from that person's session.
- Photos are shrunk to JPEG, at most 1600 px, before saving.
- A report made offline keeps the time it was made, provided that is within the last 7 days.

**Pages that open offline** (`public/sw.js`):
- **Build files:** scripts and styles are served from the phone once downloaded.
- **Saved pages:** My Day, Emergency, Report a hazard, My tasks **and each of the worker's open task pages**, My reports and Notifications.
  - Online, the network is always used. With no signal, the saved copy opens.
  - These pages are saved in the background after sign-in, so they work even if never opened before.
- **Any other page** with no signal shows `public/offline.html`, which has Call 911 and links to the saved pages.
- **Personal data:** saved pages are **wiped at the login screen** and when a different person signs in on the same phone.

**Kept online only, on purpose:** the daily check-in. Its live photo and location are checked at the moment they arrive.

### 3.9 Compliance tab removed for workers

For a worker, the Compliance tab showed:
- **co-workers' certificate status** (a privacy problem)
- the permit log
- the **company's PPE stock and unit costs**
- equipment lists
- contractor notices

None of it is the worker's job.

**What changed:**
- **Menu slot:** for plain workers it is now **Reports**.
- **`/compliance`:** plain workers are sent to their own certificates. This is enforced on the server in `app/(app)/compliance/layout.tsx`.
- **"Manage compliance" extra right:** a worker who has it keeps Compliance.
- **Supervisors and managers:** unchanged.

---

## 4. Demo walkthrough

Sign in with password `demo1234`.

| Account | Role | Try |
|---|---|---|
| `kevin@besco.example` | Worker, Markey + Lexington | Bell (4 new) · Reports tab (5 reports at every stage) · My Tasks (a sent-back task, and an assigned job with photo optional) · Emergency · My profile → certifications |
| `sofia.alvarez@besco.example` | Worker, Markey | Check-in waiting for review |
| `justus@besco.example` | Supervisor, Markey | Approve or send back Kevin's fixes from the task page |
| `tanya.brooks@besco.example` | Supervisor, Louisville | Gets a 404 for Markey items (access check) |
| `patrick@besco.example` | Admin | Full company view |

**To try offline:** build and run (`pnpm build && npx next start`), sign in as Kevin and wait a few seconds. Then switch the phone or browser offline, or stop the server, and:
- open Emergency
- report a hazard
- mark a task fixed

Come back online and watch them send.

---

## 5. How it was checked

All checks ran in a real browser (Chrome through Puppeteer) against the production build, at phone (390 px) and desktop (1366 px) sizes.

**Certificates:**
- **Upload rules:** expired, duplicate and valid uploads each behave as intended.
- **File access:** the owner and their reviewers can open the file; other workers and other sites' supervisors get 404.

**Tasks:**
- **Fix loop:** mark fixed with a photo, get sent back, see the reason, redo.
- **Photo rules:** a hazard fix is blocked without a photo; an assigned job is completed with a note only.
- **Access:** of 200 tasks, a worker can open only their own.

**Notifications:** the bell count is correct and clears when the list is opened.

**My reports:** shows every stage; a new report appears after it is sent.

**Offline, with the server actually stopped:**
- The Emergency page opened from the saved copy.
- Other pages showed the offline screen.
- Kevin marked a job fixed; it showed "Saved on your phone" and "1 waiting to send", and was filed once the server came back.

**Outbox endpoint:**
- another site's ID → `422 Pick one of your sites`
- a resend → filed once (`duplicate: true`)
- a request with no Origin header → `403`

**Menu:** Kevin sees My Day · My Tasks · Reports · More, and `/compliance` sends him to his certificates. Justus still sees and opens Compliance.

**Build:** `pnpm build` passes. `pnpm lint` shows 0 errors and 1 old warning (`SiteLocation` unused in `lib/actions/compliance.ts`).

---

## 6. Changes outside the worker screens

Every change below is either an access fix (so people only see their own company's and sites' data) or support for a worker feature. None changes how a supervisor screen looks or works for its own users, except that lists are now correctly limited to their sites.

**Access fixes on supervisor screens:**

| File | Change |
|---|---|
| `compliance/page.tsx` | Supervisors see their own sites and crews; previously the whole company |
| `compliance/{training,permits,notices,equipment}/new` | People and site pickers limited to the user's sites (`peopleFor`, `sitesFor`) |
| `corrective-actions/new` | Assignee picker limited to the user's sites; a task can only be assigned to that site's crew |
| `inspections/[id]`, `projects/[id]`, `projects/[id]/inspections/new` | Pages for sites the user isn't on return 404 (`accessibleProject`) |
| `incidents/page.tsx`, `incidents/new` | Workers see their working site; people pickers limited to site crews |
| `components/work-tabs.tsx` | Counts follow the worker's working site |

**Worker-feature support:**

| File | Change |
|---|---|
| `projects/[id]/edit` | Site boundary fields, used by the daily check-in |
| `projects/[id]` | Plain workers get a simple site view (`WorkerSiteView`) |
| `compliance/training/new` | Uses the shared certificate type list |
| `compliance/layout.tsx` | Plain workers are sent to their own certificates |

**Shared code:**

| File | Change |
|---|---|
| `lib/scope.ts`, `lib/authz.ts` | Site-scoping helpers (`accessibleProject`, `peopleFor`, `worksOnSite`, …) and check-in capabilities |
| `lib/types.ts` | New optional fields: certificate review and document, task proof / sent-back / assigned-by, `Project.emergency`, `CheckIn` |
| `lib/db.ts`, `lib/seed.ts` | New queries; store is now V8; demo data for every feature above |
| `lib/actions/*` | Server-side access checks; finding approval records `assignedById` |
| Removed: `lib/actions/hazards.ts`, `completeTaskAction` | Replaced by `lib/hazard-report.ts` and `lib/task-complete.ts` (same rules, also used offline) |
| `app/(app)/layout.tsx`, `components/topbar.tsx` | Bell for workers; outbox for anyone not read-only |
| `components/nav-items.ts`, `sidebar.tsx`, `mobile-nav.tsx` | Reports instead of Compliance for plain workers |
| `app/login/page.tsx` | Wipes saved offline pages at login |
| `next.config.ts` | Upload limit 5 MB; headers for the service worker |

**Not committed:** `resources/` (business documents) and a stray `pnpm-lock.yaml` change with no matching `package.json` change.

---

## 7. Handoff to the supervisor / safety-manager developer

These worker features are complete, but some only fully pay off once the other side is built:

1. **Review screens.** The server functions already exist:
   - **Check-ins:** `reviewCheckIn` ([daily-check-in.md](daily-check-in.md))
   - **Certificates:** `reviewCertificationAction` ([certifications.md](certifications.md))
   - **Task fixes:** the task page already has Approve, Send back and Close out, so a queue can just link to it ([tasks.md](tasks.md))
2. **Assign a fix form:** add a "Photo required / Optional / Not needed" choice that sets `CorrectiveAction.proof`.
3. **Project edit form:** add the `Project.emergency` fields.
4. **Reviewing hazard reports:** the reason for "no fix needed" (`finding.overrideReason`) **is shown to the worker**, so write it for them.
5. **Notifications** need nothing from that side; they appear automatically from the records.

---

## 8. Not done yet / next steps

| Priority | Item |
|---|---|
| 1 | **Push notifications** to the phone when the app is closed (push keys + one subscription per device) |
| 2 | **Toolbox talks:** read the day's safety talk and sign attendance |
| 3 | **My permits:** permits the worker is named on (e.g. confined-space attendant) |
| 4 | **My PPE:** what was issued to them, plus a replacement request |
| 5 | **Full history** of check-ins and inspections (My Day shows only the last few) |
| 6 | **Spanish and larger-text options** |
| 7 | **Certificate warning on tasks** (e.g. "this task needs LOTO; yours has expired") |
| — | Offline for incident reports (only hazard reports and task fixes are offline today) |
| — | Real database. Today's data, including read state and outbox receipts, lives in memory |
