---
name: verify
description: Build, run and drive the Banisa app locally to observe a change working end-to-end (patient web, clinic panel, admin panel, backend API).
---

# Verifying Banisa changes locally

Monorepo: `backend/` (Express + Prisma + Postgres) and `code/` (React + Vite).

## Handle

Local Postgres is already running; `backend/.env` points at `banisa_db`
(user `banisa_user`). The DB is **schema-complete but essentially empty**
(services + categories seeded, zero clinics) — most flows need a fixture.

```bash
# backend on :5000 — vite proxies /api and /uploads here, so use this port
cd backend && nohup env TELEGRAM_BOT_TOKEN= PORT=5000 npx ts-node src/server.ts > /tmp/api.log 2>&1 &
cd code && nohup npx vite --port 5173 > /tmp/vite.log 2>&1 &
# ~30s to boot; "Server is running on port 5000" in the log means ready
```

**Always blank `TELEGRAM_BOT_TOKEN`.** `backend/.env` holds the *production*
bot token — booting with it makes your local process poll Telegram and steal
real users' bot updates from prod.

`psql "$DATABASE_URL"` fails with `invalid URI query parameter: "schema"` —
strip it: `DB=$(grep ^DATABASE_URL= .env | cut -d= -f2- | sed 's/?schema=public//')`

Stop servers by port, not `pkill -f`: a `pkill -f "server.ts"` pattern also
matches your own shell's command line and kills the tool call (exit 144).

```bash
P=$(ss -lptnH 'sport = :5000' | grep -oP 'pid=\K[0-9]+' | head -1); kill "$P"
```

## Fixtures

**IDs must be real v4 UUIDs** (`...-4xxx-8xxx-...`). Placeholder ids like
`aaaaaaaa-0000-0000-0000-000000000001` pass Prisma but the cart/booking zod
schemas reject them with `invalid_format: uuid` — you get a confusing 400 on
the money path only.

Minimal clinic + service fixture (required NOT NULL cols: `nameUz`, `region`,
`district`, `street`, `updatedAt`; `status='APPROVED'` + `isActive=true` or
public endpoints filter it out):

```sql
INSERT INTO "Clinic" (id,"nameUz",region,district,street,status,"isActive","updatedAt")
VALUES ('11111111-1111-4111-8111-111111111111','ALFA','Toshkent','Chilonzor','1','APPROVED',true,now());
INSERT INTO "ClinicDiagnosticService" (id,"clinicId","diagnosticServiceId","isActive") VALUES (...);
-- ServiceCustomization.clinicServiceId → ClinicDiagnosticService.id; customNameUz
-- renames the SERVICE for that clinic (not the clinic).
```

Clean the fixture up afterwards — this DB persists between sessions.

## Driving

Patient catalog pages are behind `PatientSiteGuard` → you need a logged-in
patient. Register via API, then log in through the real form:

```bash
curl -s -X POST http://localhost:5000/api/user/auth/register -H 'Content-Type: application/json' \
  -d '{"phone":"+998901112233","password":"test1234","firstName":"Test","lastName":"Bemor"}'
```

Playwright is available (`npx playwright install chromium` once). Install it in
your scratchpad, not the repo. Drive:
`/user/login` → fill `input[type=tel]` + `input[type=password]` → submit →
navigate to `/klinikalar/<id>`.

Useful selectors: `.cdp-book-btn` ("Bron qilish" on clinic page),
`.cdp-svc-item` (service row), `.xd-sb-cart-btn` (add-to-cart on service page),
`.xd-cp-name` (clinic name shown on service page).

Attach `page.on('response')` for `/api/` to capture what the UI actually sent —
that's where wrong-clinic / wrong-amount bugs surface.

Confirm money-path outcomes in the DB, not the UI toast:
`SELECT c."nameUz" FROM "CartItem" ci JOIN "Clinic" c ON c.id=ci."clinicId";`

## Prod (read-only checks)

`sshpass -p "$PW" ssh root@137.184.85.40`, then on the box
`cd /root/banisa/backend && DB=$(grep ^DATABASE_URL= .env | cut -d= -f2-)`.
Prod DB is `banisa_db`. Never point a local process at it.
