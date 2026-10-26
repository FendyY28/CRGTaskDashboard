# 🏢 BSI CRG Task & Project Monitoring Dashboard

> **Enterprise SDLC & Task Monitoring System** developed for **Bank Syariah Indonesia (BSI) - Customer Relationship Group (CRG) Division**.

---

## 📌 Table of Contents

- [Quick Start (clone ➔ running in 3 steps)](#-quick-start-clone--running-in-3-steps)
- [Overview](#-overview)
- [Key Feature Modules](#-key-feature-modules)
- [Tech Stack](#-tech-stack)
- [System Architecture & Directory Structure](#-system-architecture--directory-structure)
- [Prerequisites](#-prerequisites)
- [Step-by-Step Installation & Running Guide](#-step-by-step-installation--running-guide)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Default Credentials](#3-default-credentials)
- [Environment Variables Reference](#-environment-variables-reference)
- [Troubleshooting](#-troubleshooting)
- [Security & Compliance Highlights](#-security--compliance-highlights)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🚀 Quick Start (clone ➔ running in 3 steps)

### Step 1 - Install the prerequisites

| Tool | Version | Notes |
| :--- | :--- | :--- |
| Node.js | 20 LTS or newer | <https://nodejs.org> |
| PostgreSQL | 14 or newer | Use Docker (below) or an existing local install |

Database via Docker (recommended, matches `docker-compose.yml`):

```bash
docker compose up -d postgres
```

That starts PostgreSQL on `localhost:5432` with user `postgres`, password `superuser` and database `bsi_crg_db`.
Using an existing PostgreSQL install instead? Keep it running and point `DATABASE_URL` at it in step 2.

### Step 2 - Create your `.env` files and install dependencies

**Windows:** double-click **`setup-local.bat`** (asks for your DB credentials, then does everything below).

**Any OS from a terminal:**

```bash
npm run setup
```

Prefer to do it manually?

```bash
npm run env:init                 # copies backend/.env.example + frontend/.env.example
# then edit backend/.env (DATABASE_URL, JWT_SECRET)
npm install --prefix backend
npm install --prefix frontend
npm run setup --prefix backend   # creates DB, migrates, seeds
```

> **Never commit `backend/.env`** - it is git-ignored. Only the `.env.example` files are tracked.

### Step 3 - Run

**Windows:** double-click **`run-local.bat`** (opens backend + frontend in two windows and your browser).

**Any OS:**

```bash
npm run dev
```

| Service | URL |
| :--- | :--- |
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:3000> |
| Login | `admin@example.com` / `password123` |

### Cheat sheet (run from the repository root)

| Command | What it does |
| :--- | :--- |
| `npm run setup` | One-time setup: env files, install, create DB, migrate, seed |
| `npm run dev` | Start backend + frontend together (alias: `npm run start:all`) |
| `npm run build` | Production build of backend and frontend |
| `npm run test` | Backend (Jest) + frontend (Vitest) test suites |
| `npm run db:setup --prefix backend` | Re-run migrate + seed only |
| `npm run prisma:generate --prefix backend` | Regenerate the Prisma Client |
| `setup-local.bat` / `run-local.bat` | Windows double-click equivalents of `setup` / `dev` |

---

## 📖 Overview

**BSI CRG Task Dashboard** is an enterprise-grade monitoring and management platform designed to track the end-to-end **Software Development Life Cycle (SDLC)** across projects in the CRG division.

The system empowers team leads, project managers, and officers to:
- Oversee multi-project SDLC phases and timeline schedules via interactive Gantt charts.
- Track weekly progress logs and granular developer task completion.
- Execute and monitor User Acceptance Testing (UAT) test cases and defect lifecycles.
- Manage Post-Implementation Review (PIR) live issues, severity classifications, and optimization ideas.
- Comply with banking security policies including **180-day password rotation** and OTP-verified authentication.

---

## ✨ Key Feature Modules

### 1. 📊 Overview Dashboard
- **Real-Time KPIs**: Total, active, completed, and freshly launched projects.
- **SDLC Phase Breakdown**: High-level progress tracker categorized across the 6 master phases.
- **Live Activity Audit Log**: Real-time chronological audit trail of all mutations (create, update, status change, delete).

### 2. 📅 Task Timeline & Gantt Chart
- **6 Master SDLC Phases**: `Requirement` ➔ `TF Meeting` ➔ `Development` ➔ `SIT` ➔ `UAT` ➔ `Live`.
- **Interactive Gantt Chart**: Multi-view Gantt chart (Month, Week, Day) with cycle history archive.
- **Weekly Progress Logs**: Breakdown of weekly milestones with task toggling and automatic parent progress recalculation.
- **Cycle Iteration Management**: Smart automation to transition completed projects into new development cycles.

### 3. 🧪 QA & Testing Status (UAT)
- **Test Suite Categorization**: Positive and Negative test case scenarios.
- **Defect Management**: Defect logging with severity levels (`Low`, `Medium`, `High`, `Critical`) linked to failing test cases.
- **Takeout / Soft-Delete System**: Archive obsolete test cases with audit logging of user and takeout rationale.

### 4. 🔍 Post-Implementation Review (PIR)
- **Live Issue Tracker**: Categorized by priority (`Critical`, `High`, `Medium`, `Low`) and status (`Open`, `In-Progress`, `Resolved`).
- **Optimization Notebook**: Ideation tracker for developers and reviewers to record technical debt and future enhancements.

### 5. 📈 Analytics & Executive Reporting
- **Interactive Visualizations (Recharts)**:
  - Project Health Distribution (Pie Chart).
  - Average Progress Velocity per Phase (Bar Chart).
  - UAT Testing Quality Index (Pass/Fail/Takeout ratio).
  - Top Failing Projects / Defect Rankings.
  - Live Issues Breakdown by Priority.
- **Multi-Project Dynamic Filter**: Filter analytics by specific projects with real-time search.

### 6. 🛡️ Security & Compliance (Banking Standards)
- **180-Day Password Rotation Policy**: Enforces password rotation in compliance with banking security standards.
- **Navigation-Triggered Pop-Up Reminder**: An unmissable pop-up modal that alerts users on every page navigation during the final warning window ($\le 7$ days).
- **Email OTP Verification**: Two-step OTP verification sent via SMTP for password resets and changes.
- **Role-Based Access Control (RBAC)**: Secure access tailored for `ADMIN`, `OFFICER`, and `HEAD`.
- **Bilingual Interface**: Full internationalization (i18n) support in **Indonesian (ID)** and **English (EN)**.

---

## 🛠️ Tech Stack

### Backend
| Technology | Description |
| :--- | :--- |
| **NestJS (v11)** | Enterprise Node.js TypeScript framework |
| **Prisma ORM (v6)** | Next-generation ORM for PostgreSQL |
| **PostgreSQL** | Primary relational database |
| **Passport & JWT** | Token-based stateless authentication |
| **Nodemailer & MailerModule** | SMTP transactional email & OTP service |
| **Bcrypt** | Password hashing with salt rounds |

### Frontend
| Technology | Description |
| :--- | :--- |
| **React 18 & Vite 6** | Ultra-fast single-page application framework |
| **TypeScript** | Type-safe development |
| **Tailwind CSS (v4)** | Modern utility-first CSS design system |
| **Lucide React** | Consistent iconography |
| **Radix UI / Shadcn** | Accessible headless UI components |
| **Recharts (v3)** | Composable charting library |
| **gantt-task-react** | Interactive Gantt chart visualization |
| **i18next** | Internationalization (ID & EN) |
| **Sonner** | Modern toast notification manager |

---

## 📁 System Architecture & Directory Structure

```
CRGTaskDashboard/
├── setup-local.bat             # Windows: one-time setup (install + DB + seed)
├── run-local.bat               # Windows: start backend + frontend
├── scripts/                    # npm run setup / env:init helpers
├── docker-compose.yml          # PostgreSQL + backend + frontend containers
│
├── backend/
│   ├── .env.example            # Template for backend/.env (copy, don't commit .env)
│   ├── prisma/
│   │   ├── migrations/         # PostgreSQL database migrations
│   │   ├── schema.prisma       # Database models & relations
│   │   └── seed.ts             # Initial master database seed
│   ├── scripts/create-db.js    # Creates the database if it does not exist
│   ├── src/
│   │   ├── audit/              # Activity log service & controller
│   │   ├── auth/               # JWT authentication, guards, OTP & strategies
│   │   ├── common/             # Shared helpers & email validation
│   │   ├── prisma/             # Prisma database service module
│   │   ├── project/            # Project, timeline, QA, & PIR business logic
│   │   ├── user/               # User management & administration
│   │   ├── app.module.ts       # Root NestJS application module
│   │   └── main.ts             # Application entry point & CORS configuration
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── .env.example            # Template for frontend/.env (VITE_API_URL)
│   ├── public/                 # Static assets & logos
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # UI primitives, cards, sheets, & modals
│   │   │   ├── constants/      # Color palettes & master constants
│   │   │   ├── hooks/          # Custom hooks (projects, analytics, PIR, etc.)
│   │   │   ├── pages/          # Dashboard, Timeline, Testing, PIR, Analytics
│   │   │   ├── services/       # Centralized Fetch API wrapper with JWT interceptor
│   │   │   └── types/          # Global TypeScript interfaces
│   │   ├── locales/            # Translation dictionaries (id.json & en.json)
│   │   ├── App.tsx             # Root routing, route guards, & layout structure
│   │   └── main.tsx            # React application bootstrap
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed:
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher (or `pnpm` / `yarn`)
- **PostgreSQL**: `v14.x` or higher (running locally or via Docker)

---

## 🚀 Step-by-Step Installation & Running Guide

> In a hurry? Use the [Quick Start](#-quick-start-clone--running-in-3-steps) above, or just run `npm run setup` then `npm run dev`.

### 1. Backend Setup

1. Open your terminal at the **repository root** (not inside `backend/`) and create the env files:
   ```bash
   npm run env:init
   ```

2. Fill in `backend/.env` (it was copied from `backend/.env.example`):
   ```env
   # Database Connection String (PostgreSQL)
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/bsi_crg_db?schema=public"

   # Server Port
   PORT=3000

   # JWT signing secret — generate with: openssl rand -hex 32
   JWT_SECRET="replace-with-a-long-random-secret"

   # SMTP Email Configuration (for OTP & Notifications)
   MAIL_HOST="smtp.gmail.com"
   MAIL_USER="your_email@gmail.com"
   MAIL_PASS="your_gmail_app_password"
   MAIL_FROM="your_email@gmail.com"
   ```
   *The backend refuses to start while `JWT_SECRET` is still the placeholder.*

3. Install dependencies:
   ```bash
   npm install --prefix backend
   ```

4. Create the database (if it does not exist), run migrations and seed sample data:
   ```bash
   npm run setup --prefix backend
   ```
   This expands to `db:create`, `prisma generate`, `prisma migrate deploy` and `prisma db seed`.
   The seed creates the admin account, sample projects, test cases and PIR logs.

5. Start the backend development server:
   ```bash
   npm run start:dev --prefix backend
   ```
   *The backend will be running at `http://localhost:3000`.*

> `prisma migrate deploy` replays the committed migrations (use it on any database you did not create yourself).
> `prisma migrate dev --name <name>` is only for developers **changing** `schema.prisma`.

---

### 2. Frontend Setup

1. `frontend/.env` was already created by `npm run env:init`. It only needs one variable:
   ```env
   VITE_API_URL="http://localhost:3000"
   ```
   (Defaults to `http://localhost:3000` when unset. It is baked in at build time, so it must be reachable from the browser.)

2. Install dependencies:
   ```bash
   npm install --prefix frontend
   ```

3. Start the frontend development server:
   ```bash
   npm run dev --prefix frontend
   ```
   *The frontend dashboard will be running at `http://localhost:5173`.*

> Or start both servers at once from the repo root with `npm run dev`.

---

### 3. Default Credentials

After seeding the database (`npm run db:seed --prefix backend`), log in with the following default Super Admin account:

- **Email**: `admin@example.com`
- **Password**: `password123`
- **Role**: `ADMIN`

---

## 🔧 Environment Variables Reference

### `backend/.env` (copied from `backend/.env.example`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string, e.g. `postgresql://postgres:superuser@localhost:5432/bsi_crg_db?schema=public` |
| `JWT_SECRET` | ✅ | Signing secret, at least 32 chars. The backend refuses to start otherwise. |
| `PORT` | — | Backend port (default `3000`) |
| `CORS_ORIGINS` | — | Comma-separated allowed origins (default `http://localhost:5173`) |
| `FRONTEND_URL` | — | Base URL used in verification e-mail links |
| `MAIL_HOST` / `MAIL_USER` / `MAIL_PASS` / `MAIL_FROM` | — | SMTP for OTP and notification e-mails. Without it, e-mail flows fail but local login still works. |
| `ABSTRACT_API_KEY` | — | Optional e-mail deliverability check on registration |

### `frontend/.env` (copied from `frontend/.env.example`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | — | Backend base URL used by the browser (default `http://localhost:3000`) |

---

## 🧭 Troubleshooting

| Symptom | Cause / Fix |
| :--- | :--- |
| `EADDRINUSE :3000` or `:5173` | An old dev server is still running. Stop it: `netstat -ano \| findstr :3000` then `taskkill /PID <pid> /F` (Windows), or `lsof -i :3000` (macOS/Linux). |
| `Can't reach database server at localhost:5432` | PostgreSQL is not running. Start it with `docker compose up -d postgres` or your local service. |
| `database "bsi_crg_db" does not exist` | Run `npm run db:create --prefix backend`, or create it in pgAdmin/psql. |
| `JWT_SECRET is still a placeholder or too short` | Generate one: `openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) and paste it into `backend/.env`. |
| `P1001` / `EPERM` from Prisma on Windows | Stop running `node` processes (dev server, editors) and re-run `npm run prisma:generate --prefix backend`. |
| OTP / verification e-mails never arrive | SMTP is optional for local work; log in directly with the seeded admin account instead. |
| Browser shows network errors calling the API | `VITE_API_URL` in `frontend/.env` must point at the backend URL reachable from your browser, then restart `npm run dev`. |

---

## 🔐 Security & Password Pop-Up Testing

The system enforces a **180-day password rotation rule**. If a user's password was changed more than 173 days ago (leaving $\le 7$ days), a **mandatory pop-up reminder** triggers on every page navigation.

### Quick Manual Test via Browser Console:
While logged into the dashboard, open Developer Tools (**F12** $\rightarrow$ **Console**) and run:

```javascript
// Simulate password changed 175 days ago (leaves 5 days left - Warning state)
const d = new Date();
d.setDate(d.getDate() - 175);
localStorage.setItem('password_changed_at', d.toISOString());
location.reload();
```

```javascript
// Reset back to today (Fresh password - Pop-up disappears)
localStorage.setItem('password_changed_at', new Date().toISOString());
location.reload();
```

---

## 📦 Build & Production Commands

Everything at once (from the repo root):
```bash
npm run build
```

### Backend Build
```bash
npm run build --prefix backend
npm run start:prod --prefix backend
```

### Frontend Build
```bash
npm run build --prefix frontend
npm run preview --prefix frontend
```

---

## 📄 License
Internal proprietary application for **PT Bank Syariah Indonesia Tbk (BSI)** - All Rights Reserved.
