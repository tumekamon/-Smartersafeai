# -Smartersafeai
 Smartersafeai is a modern workplace health and safety management system designed to help organizations manage risks, inspections, incidents, compliance, training, and safety records from one platform .

## Run it on your own computer (offline)

You need [Node.js](https://nodejs.org) 20 or newer and [pnpm](https://pnpm.io) (`npm install -g pnpm`).

```bash
pnpm install        # once, needs internet to download packages
pnpm dev            # starts the app at http://localhost:3000
```

After `pnpm install` the app runs fully offline: there is no external database or API to reach.
For a production-like run use `pnpm build` then `pnpm start`.

### Demo accounts

Every account starts with the password `demo1234` (change it under More → My profile).
The sign-in page has one-tap buttons for each:

| Level | Person | Email |
|---|---|---|
| L1 Admin | Patrick Murani | patrick@besco.example |
| L2 Safety Manager | Lawrence Kibet | lawrence@besco.example |
| L2 Safety Manager | Amon Tumek | amon@besco.example |
| L3 Supervisor | Justus Gitau | justus@besco.example |
| L4 Worker | Kevin Otieno | kevin@besco.example |
| Client (read-only) | Dana Whitfield | dana@walsh.example |

### Settings

| Variable | Needed? | What it does |
|---|---|---|
| `SESSION_SECRET` | Recommended (32+ characters) | Key that encrypts sign-in cookies. Without it a random key is made at start-up, so everyone is signed out when the server restarts. |

## The database (simulated for now)

There is no database server yet. All data lives in memory (`lib/db.ts`), filled with realistic
simulated data from `lib/seed.ts` each time the server starts, so **changes reset on restart**.
Every read and write goes through the functions in `lib/db.ts`, which is the one file to replace
when a real database (e.g. Postgres) is added.

What is stored (types in `lib/types.ts`):

| Table | What it holds |
|---|---|
| companies | Name, brand colour, hazard categories, what each role sees, custom incident questions |
| users | Name, email, role level (L1–L4), read-only flag, extra permissions, active flag |
| credentials | Salted scrypt password hashes, kept apart from users (`lib/password.ts`) |
| projects | Sites: levels, zones, crew (who works there) |
| templates | Inspection checklists and the hazard each item maps to |
| inspections | Who inspected what, where, answers and photos |
| findings | Hazards raised by the (simulated) AI or reported from site, and the review decision |
| correctiveActions | Fixes: owner, due date, open → done → verified → closed |
| incidents | Near misses, injuries, damage, with answers to the company's own questions |
| certifications, permits, ppeItems, assets, gcNotices | Compliance records |

The "AI" is also simulated (`lib/mock-ai.ts`): failed checklist items become findings, and photo
checks on hazard reports are labelled "simulated" until a real vision model is connected.

## Security in this prototype

- Passwords are stored only as salted scrypt hashes; sign-in errors never reveal whether an email exists.
- After 5 wrong passwords for one email (or 30 from one network address) sign-in pauses for 15 minutes.
- The session cookie is encrypted and signed (AES-256-GCM), HTTP-only, and expires after 7 days.
- Deactivated accounts lose access immediately.
- Location and device data (EXIF) are removed from uploaded JPEG photos.
- Standard security headers are sent on every page (no framing, no MIME sniffing, HSTS).
