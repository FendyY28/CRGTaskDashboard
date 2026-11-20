# ⚙️ BSI CRG Task Dashboard — Backend API

NestJS 11 + Prisma 6 + PostgreSQL REST API behind the BSI CRG Task & Project Monitoring Dashboard.

> New here? The fastest path is the [root README](../README.md#-run-it-locally): `npm run setup` once, then `npm run dev` from the repository root. This file documents the API itself and backend-only details.

---

## Requirements

- Node.js **20+**
- PostgreSQL **14+** reachable through `DATABASE_URL` (`docker compose up -d postgres` starts a matching one on port 5432)

## Environment (`backend/.env`)

Git-ignored; created from `.env.example` by `npm run env:init` (or `copy .env.example .env` on Windows, `cp .env.example .env` on macOS/Linux).

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/bsi_crg_db?schema=public"
PORT=3000
JWT_SECRET="<openssl rand -hex 32>"
CORS_ORIGINS="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"

MAIL_HOST="smtp.gmail.com"
MAIL_USER=""
MAIL_PASS=""
MAIL_FROM="noreply@bsi-crg.local"
ABSTRACT_API_KEY=""
```

| Variable | Required | Behaviour |
| :--- | :---: | :--- |
| `DATABASE_URL` | ✅ | Startup fails when empty. |
| `JWT_SECRET` | ✅ | Startup fails when empty, shorter than 32 chars, or still a placeholder (`main.ts`). |
| `PORT` | — | Default `3000`; a busy port prints a friendly message and exits. |
| `CORS_ORIGINS` | — | Comma-separated. Empty ⇒ falls back to `http://localhost:5173`. |
| `FRONTEND_URL` | — | Used to build verification links (`/verify-email?token=…`). |
| `MAIL_*` | — | **Optional.** When `MAIL_USER`/`MAIL_PASS` are empty or still template values, e-mails are written to the console (OTP, temporary password, verification link) instead of being sent — see `AuthService.deliverMail`. |
| `ABSTRACT_API_KEY` | — | **Optional.** With no key, `/auth/validate-email` only checks the address format. |

## Setup & run

```bash
npm install
npm run setup        # db:create → prisma generate → migrate deploy → db:seed
npm run start:dev    # http://localhost:3000 (watch mode)
```

| Script | Purpose |
| :--- | :--- |
| `npm run setup` | Full first-time database setup (see above). |
| `npm run db:create` | Create the database from `DATABASE_URL` if it does not exist. |
| `npm run db:migrate` | `prisma migrate deploy` — replays committed migrations. |
| `npm run db:seed` | Admin user + sample projects, tasks, test cases, issues. |
| `npm run db:setup` | migrate + seed without `prisma generate`. |
| `npm run db:check` | Read-only connectivity / table check (`scripts/db-healthcheck.js`). |
| `npm run prisma:generate` | Regenerate the Prisma Client. |
| `npm run build` / `npm run start:prod` | Compile to `dist/` and run it. |
| `npm run test` / `test:cov` | Jest unit tests. |
| `npm run lint` | ESLint with `--fix`. |

Seeded login: `admin@example.com` / `password123` (role `ADMIN`). Re-running the seed resets the local data.

> `prisma migrate deploy` is for applying migrations. When you **change** `prisma/schema.prisma`, create a migration with `npx prisma migrate dev --name <change>` in this folder.

## API reference

Base URL `http://localhost:3000`. Unless marked *public*, routes need `Authorization: Bearer <jwt>`.

| Module | Method | Endpoint | Notes |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/login` | *public* — returns `access_token` (1 day) + profile. `403 PASSWORD_EXPIRED` after 180 days. |
| | `GET` | `/auth/me` | Current profile incl. `passwordChangedAt`. |
| | `POST` | `/auth/validate-email` | *public* — format check (+ Abstract API when configured). |
| | `POST` | `/auth/verify-email` | *public* — activate an account from the e-mailed token. |
| | `POST` | `/auth/forgot-password` | *public* — always the same response (no user enumeration). |
| | `POST` | `/auth/reset-password` | *public* — e-mail + OTP + new password. |
| | `POST` | `/auth/request-change-password-otp` | OTP for the logged-in user. |
| | `PATCH` | `/auth/change-password` | Old password + OTP + new password. |
| | `PATCH` | `/auth/:id/admin-reset-password` | `ADMIN` only — random password e-mailed. |
| **Projects** | `GET` / `POST` | `/project` | List with relations / create. |
| | `PATCH` / `DELETE` | `/project/:id` | Update (incl. phase advance) / cascade delete. |
| | `POST` | `/project/cycle/:id` | Start the next cycle. |
| | `POST` | `/project/log` | Add a weekly progress log. |
| | `PATCH` | `/project/task/:id/toggle` | Toggle task completion, rolls up progress. |
| **QA / UAT** | `GET` | `/project/:id/test-cases` | Test cases (+ defects) for a project. |
| | `POST` / `PATCH` | `/project/test-case` `/project/test-case/:id` | Create / update, incl. defects and takeout. |
| **PIR** | `GET` / `POST` | `/project/issue` | Live issues. |
| | `POST` | `/project/improvement` | Optimization notes. |
| **Audit** | `GET` | `/audit` | Recent activity entries. |
| **Users** | `GET` / `POST` | `/users` | `ADMIN` only. |
| | `PATCH` | `/users/:id` | `ADMIN` only — update role. |

Cross-cutting behaviour:

- Global `ValidationPipe` (`whitelist`, `transform`) — unknown DTO fields are stripped.
- Global rate limit: 100 req/min per IP (`@nestjs/throttler`); auth routes are stricter.
- Login throttle: 5 failures ⇒ 15-minute lockout for that e-mail.
- Every mutation writes an `AuditLog` row (actor, action, project, details).

## Source map

| Path | Contents |
| :--- | :--- |
| `src/main.ts` | Bootstrap: env validation, global pipes, CORS, port handling. |
| `src/app.module.ts` | Root module: config, throttler, mailer transport, feature modules. |
| `src/auth/` | Login, OTP flows, password policy, `JwtStrategy`, `RolesGuard`. |
| `src/project/` | Projects, SDLC timeline, weekly logs, QA/UAT, PIR, SIT pipeline. |
| `src/user/` | User administration (create sends a welcome e-mail). |
| `src/audit/` | Audit trail service. |
| `src/common/` | Shared helpers (`EmailVerifierService`). |
| `src/prisma/` | `PrismaModule` / `PrismaService`. |
| `prisma/schema.prisma` | Data model: `User`, `Project`, `SDLCPhase`, `PhaseNote`, `WeeklyProgress`, `Task`, `TestCase`, `Defect`, `Issue`, `Improvement`, `SitProcess`, `AuditLog`. |
| `scripts/` | `create-db.js`, `db-host.js`, `db-healthcheck.js`. |

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `Port 3000 is already in use` | Stop the other process or set `PORT` in `.env`. |
| `Can't reach database server` | Start PostgreSQL (`docker compose up -d postgres`). |
| `database "bsi_crg_db" does not exist` | `npm run db:create`. |
| `JWT_SECRET is still a placeholder or too short` | Generate with `openssl rand -hex 32`. |
| `P1001` / `EPERM` from Prisma on Windows | Close running node processes, re-run `npm run prisma:generate`. |
| E-mails never arrive | Expected when `MAIL_USER`/`MAIL_PASS` are empty — the body is printed in this server's console. |
