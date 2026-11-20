# 🏢 BSI CRG Task & Project Monitoring Dashboard

> **Enterprise SDLC & Task Monitoring System** built for the **Customer Relationship Group (CRG) division of Bank Syariah Indonesia (BSI)** — track every project from requirement to live, in one dashboard.

![Stack](https://img.shields.io/badge/stack-NestJS%2011%20%C2%B7%20React%2018%20%C2%B7%20PostgreSQL-36A39D)
![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)
![Tests](https://img.shields.io/badge/tests-49%20passing-brightgreen)
![License](https://img.shields.io/badge/license-proprietary%20%C2%B7%20BSI-lightgrey)

This repository is a **portfolio / internal reference implementation**. It ships with demo data and a static demo build so you can explore it without a database. It contains **no real BSI data and no production credentials**.

---

## 📌 Table of Contents

- [Look at it in 60 seconds (no database)](#-look-at-it-in-60-seconds-no-database)
- [Run it locally](#-run-it-locally)
- [What the app does](#-what-the-app-does)
- [Tech stack](#-tech-stack)
- [Repository layout](#-repository-layout)
- [Environment variables (`.env`)](#-environment-variables-env)
- [Commands](#-commands)
- [API in one page](#-api-in-one-page)
- [How authentication works](#-how-authentication-works)
- [Security notes](#-security-notes)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ⚡ Look at it in 60 seconds (no database)

The frontend has a **built-in demo mode**: the app is compiled against an in-memory fake backend (`frontend/src/app/dev/demoFixtures.ts`), so there is no NestJS, no PostgreSQL, no `.env` — just static files.

```bash
npm install --prefix frontend
npm run build:demo --prefix frontend        # → frontend/dist-demo
npm exec --prefix frontend -- yes -- vite preview --outDir dist-demo
```

Then open **<http://localhost:4173/demo.html>**. Every page is reachable and pre-populated with sample projects, tasks, test cases, issues and analytics — and nothing you do is persisted.

> Windows users: double-click **`build-demo.bat`** — it runs the same two steps and opens the preview.

Because it is fully static, `dist-demo` can be published to **GitHub Pages** to give visitors a clickable preview straight from the repository. (`dist-demo` is git-ignored, so build it in CI or locally and publish the output yourself.)

---

## 🚀 Run it locally

### Prerequisites

| Tool | Version | Notes |
| :--- | :--- | :--- |
| Node.js | **20 LTS or newer** | <https://nodejs.org> (`nvm use` reads `.nvmrc`) |
| PostgreSQL | 14 or newer | Docker (below) or an existing install |

Database via Docker (matches `docker-compose.yml`): starts PostgreSQL 16 on `localhost:5432`, user `postgres`, password `superuser`, database `bsi_crg_db`.

```bash
docker compose up -d postgres
```

### One-time setup

**Windows** — double-click **`setup-local.bat`**. It asks for your PostgreSQL user/password, generates a `JWT_SECRET`, installs both projects, creates the database, runs migrations and seeds sample data.

**macOS / Linux / any terminal** — from the repository root:

```bash
npm run env:init     # copy backend/.env.example + frontend/.env.example to .env
#   ...now edit backend/.env: set DATABASE_URL and JWT_SECRET (see below)...
npm install --prefix backend
npm install --prefix frontend
npm run setup --prefix backend   # create DB → prisma generate → migrate → seed
```

> `npm run setup` (root) does all of the above in one go, but it **skips the database steps** while `backend/.env` still holds the template values — fill them in and run it again.

### Start

```bash
npm run dev          # backend + frontend together
```

**Windows:** double-click **`run-local.bat`** — it checks Node, dependencies, `.env`, the database and the ports, then opens two server windows plus your browser.

| Service | URL |
| :--- | :--- |
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:3000> |
| Demo build (static) | <http://localhost:4173/demo.html> |
| Seeded login | `admin@example.com` / `password123` (`ADMIN`) |

---

## 📖 What the app does

| Module | Highlights |
| :--- | :--- |
| **Overview dashboard** | KPI cards (total / active / completed projects), SDLC phase breakdown, live audit trail of every mutation. |
| **Task timeline & Gantt** | The six master phases `Requirement → TF Meeting → Development → SIT → UAT → Live`, interactive Gantt (month/week/day), weekly progress logs with automatic roll-up, multi-cycle iteration. |
| **QA / UAT testing** | Positive & negative test cases, defects with `Low/Medium/High/Critical` severity, soft-delete ("takeout") with reason + audit entry. |
| **Post-implementation review** | Live issue tracker by priority/status, optimization notebook for technical debt and ideas. |
| **SIT console** | Per-project SIT pipeline (standard + custom steps) with pass/fail status. |
| **Analytics** | Recharts views: project health, progress velocity per phase, UAT pass/fail ratio, top failing projects, issues by priority. |
| **Users & roles** | `ADMIN`, `OFFICER`, `HEAD` with RBAC on both API and UI; bilingual UI (**ID / EN**) via i18next. |

---

## 🛠️ Tech stack

**Backend** — NestJS 11 · Prisma 6 · PostgreSQL · Passport + JWT · bcrypt · Nodemailer · class-validator · `@nestjs/throttler`

**Frontend** — React 18 · Vite 6 · TypeScript · Tailwind CSS 4 · Radix UI · Recharts · gantt-task-react · react-router 7 · i18next · sonner · Vitest + Testing Library

---

## 📁 Repository layout

```
CRGTaskDashboard-main/
├── README.md                   # you are here
├── docker-compose.yml          # PostgreSQL 16 (+ optional backend/frontend containers)
├── setup-local.bat             # Windows: one-time setup (env, install, DB, seed)
├── run-local.bat               # Windows: preflight checks + start both servers
├── build-demo.bat              # Windows: build & preview the static demo
├── package.json                # root scripts: setup · dev · build · test
├── scripts/                    # setup.mjs (cross-platform) · init-env.mjs · run-tests.mjs
│
├── backend/
│   ├── .env.example            # template for backend/.env  (never commit .env)
│   ├── prisma/
│   │   ├── schema.prisma       # User, Project, SDLCPhase, Task, TestCase, Defect, Issue…
│   │   ├── migrations/         # committed SQL migrations (migrate deploy)
│   │   └── seed.ts             # admin user + sample projects/tests/PIR data
│   ├── scripts/                # create-db.js · db-host.js · db-healthcheck.js
│   └── src/
│       ├── auth/               # login, OTP, password policy, JWT strategy, guards
│       ├── audit/              # activity log service
│       ├── common/             # shared helpers (email verifier)
│       ├── prisma/             # PrismaModule / PrismaService
│       ├── project/            # projects, timeline, QA, PIR, SIT business logic
│       ├── user/               # user administration
│       ├── app.module.ts       # root module (config, throttling, mailer)
│       └── main.ts             # bootstrap: env validation, CORS, port
│
└── frontend/
    ├── .env.example            # template for frontend/.env
    ├── .env.demo               # loaded only by `npm run build:demo`
    ├── demo.html               # entry HTML for the static demo
    └── src/
        ├── app/
        │   ├── components/     # UI primitives, layout, modals
        │   ├── constants/      # theme, navigation, master constants
        │   ├── dev/            # in-memory demo backend (demoApi.ts, demoFixtures.ts)
        │   ├── hooks/          # projects, analytics, test cases, PIR…
        │   ├── pages/          # dashboard, timeline, testing, PIR, analytics, auth…
        │   ├── services/api.ts # fetch wrapper + JWT storage
        │   └── types/          # shared TypeScript types
        ├── locales/            # id.json · en.json
        ├── lib/utils.ts        # API_URL, token helpers
        └── main.tsx            # app bootstrap
```

---

## 🔧 Environment variables (`.env`)

Two files, both **git-ignored**; only the `.env.example` templates are committed. Create them with `npm run env:init` (they are never overwritten).

### `backend/.env`

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string, e.g. `postgresql://postgres:superuser@localhost:5432/bsi_crg_db?schema=public`. The app refuses to start without it. |
| `JWT_SECRET` | ✅ | Signing secret, **≥ 32 chars**. The app refuses to start while it is missing, too short, or still the template value. |
| `PORT` | — | API port (default `3000`). |
| `CORS_ORIGINS` | — | Comma-separated allowed origins (default `http://localhost:5173`). **Any unlisted origin falls back to plain `http://localhost:5173`.** |
| `FRONTEND_URL` | — | Base URL used in verification links inside e-mails (default `http://localhost:5173`). |
| `MAIL_HOST` | — | SMTP host (default `smtp.gmail.com`). |
| `MAIL_USER` / `MAIL_PASS` | — | SMTP credentials. **Leave empty for local work** — e-mails (OTP, temp password, verification link) are then printed to the backend console instead of being sent. |
| `MAIL_FROM` | — | From-address shown in e-mails. |
| `ABSTRACT_API_KEY` | — | Optional Abstract API key for a real e-mail deliverability check. **When empty, only the e-mail format is validated** (so `/auth/validate-email` still works locally). |

Generate a secret:

```bash
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `frontend/.env`

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_URL` | — | Backend base URL used **by the browser** (default `http://localhost:3000`). Baked in at build time, so it must be reachable from the machine opening the app — never a Docker service name. |

The demo build (`frontend/.env.demo`) is used only by `npm run build:demo`; it sets `VITE_DEMO_MODE=true` and no request ever leaves the browser — you do not need to edit it.

---

## 🧰 Commands

Run from the **repository root** unless noted.

| Command | What it does |
| :--- | :--- |
| `npm run env:init` | Create `backend/.env` + `frontend/.env` from the templates (keeps existing files). |
| `npm run setup` | Cross-platform setup: env files, install both apps, create DB, migrate, seed. Skips DB steps while placeholders remain. |
| `npm run dev` | Start backend (watch) + frontend (Vite) together. Alias: `npm run start:all`. |
| `npm run build` | Production build of backend **and** frontend. |
| `npm run test` | Backend (Jest, 49 tests) + frontend (Vitest) suites. |
| `npm run build:demo --prefix frontend` | Static, backend-free demo build → `frontend/dist-demo`. |
| `npm run setup --prefix backend` | DB only: `db:create` → `prisma generate` → `migrate deploy` → `db:seed`. |
| `npm run db:setup --prefix backend` | Re-run migrate + seed (no `prisma generate`). |
| `npm run prisma:generate --prefix backend` | Regenerate the Prisma Client. |
| `npm run db:check --prefix backend` | Read-only connectivity / table check. |
| `npm run start:dev --prefix backend` | Backend only. |
| `npm run dev --prefix frontend` | Frontend only. |
| `setup-local.bat` · `run-local.bat` · `build-demo.bat` | Windows double-click equivalents of setup · dev · demo preview. |

> Changing `backend/prisma/schema.prisma`? Use `npx prisma migrate dev --name <change>` inside `backend/` to create a migration. Everything else uses `migrate deploy`, which only replays the committed migrations.

---

## 📡 API in one page

All routes are on `http://localhost:3000`. Protected routes expect `Authorization: Bearer <token>`. Full reference: [`backend/README.md`](backend/README.md).

| Area | Endpoints |
| :--- | :--- |
| **Auth** | `POST /auth/login` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/verify-email` · `POST /auth/validate-email` · `GET /auth/me` · `POST /auth/request-change-password-otp` · `PATCH /auth/change-password` |
| **Projects** | `GET/POST /project` · `PATCH/DELETE /project/:id` · `POST /project/cycle/:id` · `POST /project/log` · `PATCH /project/task/:id/toggle` |
| **QA / UAT** | `GET /project/:id/test-cases` · `POST /project/test-case` · `PATCH /project/test-case/:id` |
| **PIR** | `GET/POST /project/issue` · `POST /project/improvement` |
| **Audit** | `GET /audit` |
| **Users** (admin) | `GET/POST /users` · `PATCH /users/:id` · `PATCH /users/:id/admin-reset-password` |

---

## 🔐 How authentication works

1. `POST /auth/login` validates the password with bcrypt and returns a **JWT (1 day)** plus the user profile.
2. During local development **no e-mail is required**: accounts created by an admin are marked `isVerified`, and if any mail would be sent while SMTP is unset, its contents (OTP, temporary password, verification link) are printed in the **backend console**.
3. Passwords **expire after 6 months**: after that, login returns `403 PASSWORD_EXPIRED` until the user resets it. A pop-up reminder appears during the last 7 days.
4. Password changes and resets require a **6-digit OTP**; five failed logins lock an account for 15 minutes.

To use real e-mail locally, put a Gmail address + app password into `MAIL_USER` / `MAIL_PASS` and the app switches back to SMTP automatically.

---

## 🛡️ Security notes

- `.env`, `node_modules/`, build output (`dist/`, `dist-demo/`) are git-ignored — **no secrets are committed**.
- Secrets are validated at boot (`backend/src/main.ts`): a placeholder or short `JWT_SECRET` stops the server.
- Passwords are bcrypt-hashed; login timing is equalised for unknown e-mails to avoid user enumeration.
- Rate limiting is global (100 req/min/IP) with stricter limits on auth routes.
- Every mutation is recorded in an audit log (actor, action, project, timestamp).
- Token storage is `localStorage`, which is convenient for a demo but **not** hardened against XSS. For a production deployment, prefer HttpOnly cookies and add CSP headers.

---

## 🧭 Troubleshooting

| Symptom | Cause / Fix |
| :--- | :--- |
| `Port 3000 is already in use` | An old dev server is running. Windows: `netstat -ano \| findstr :3000` → `taskkill /PID <pid> /F`. macOS/Linux: `lsof -i :3000`. |
| `Can't reach database server at localhost:5432` | PostgreSQL is not running → `docker compose up -d postgres`. |
| `database "bsi_crg_db" does not exist` | `npm run db:create --prefix backend` (or create it in pgAdmin/psql). |
| `JWT_SECRET is still a placeholder or too short` | Generate one (see above) and paste it into `backend/.env`. |
| `Prisma P1001` / `EPERM` on Windows | Stop running node processes (dev server, editors) and re-run `npm run prisma:generate --prefix backend`. |
| OTP / verification e-mail never arrives | Expected without SMTP — the OTP is printed in the backend window. Or log in with the seeded admin. |
| Browser can't call the API / CORS error | `VITE_API_URL` must be reachable from your browser, and the frontend origin must be in `CORS_ORIGINS`; restart after changing either. |
| `npm.ps1 cannot be loaded` (Windows PowerShell) | Scripts are blocked: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use `npm.cmd` / `cmd`. |
| Demo preview opens `index.html` instead of the app | The demo entry is `demo.html`: <http://localhost:4173/demo.html>. |

---

## 🤝 Contributing

1. Create a branch: `git checkout -b feat/short-description`.
2. Keep the layering: controllers stay thin, business rules live in services (see `auth.controller.ts` vs `auth.service.ts`).
3. Add or update a `*.spec.ts` next to the code you touch.
4. Before opening a PR, both must pass:
   ```bash
   npm run test
   npm run build
   ```
5. Never commit `backend/.env` or `frontend/.env`, and never paste a real `JWT_SECRET`, SMTP password or API key into an issue or PR.

---

## 📄 License

Internal, proprietary application for **PT Bank Syariah Indonesia Tbk (BSI)** — All Rights Reserved.
Not licensed for redistribution or commercial reuse. Published openly for **reading, review and portfolio purposes only**.
