# 🏢 BSI CRG Task & Project Monitoring Dashboard

> **Enterprise SDLC & Task Monitoring System** developed for **Bank Syariah Indonesia (BSI) - Customer Relationship Group (CRG) Division**.

---

## 📌 Table of Contents

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
- [Security & Compliance Highlights](#-security--compliance-highlights)
- [Testing & Quality Assurance](#-testing--quality-assurance)

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
├── backend/
│   ├── prisma/
│   │   ├── migrations/         # PostgreSQL database migrations
│   │   ├── schema.prisma       # Database models & relations
│   │   └── seed.ts             # Initial master database seed
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
- **PostgreSQL**: `v14.x` or higher (running locally or in cloud)

---

## 🚀 Step-by-Step Installation & Running Guide

### 1. Backend Setup

1. Open your terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file in the `backend/` folder:
   ```env
   # Database Connection String (PostgreSQL)
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/crg_dashboard?schema=public"

   # Server Port
   PORT=3000

   # SMTP Email Configuration (for OTP & Notifications)
   MAIL_HOST="smtp.gmail.com"
   MAIL_USER="your_email@gmail.com"
   MAIL_PASS="your_gmail_app_password"
   MAIL_FROM="your_email@gmail.com"
   ```

4. Run database migrations to generate database tables:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Seed initial data (Creates Admin account, sample projects, test cases, and PIR logs):
   ```bash
   npx prisma db seed
   ```

6. Start the backend development server:
   ```bash
   npm run start:dev
   ```
   *The backend will be running at `http://localhost:3000`.*

---

### 2. Frontend Setup

1. Open a new terminal tab/window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Create a `.env` file in the `frontend/` folder:
   ```env
   VITE_API_URL="http://localhost:3000"
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be running at `http://localhost:5173`.*

---

### 3. Default Credentials

After seeding the database (`npx prisma db seed`), log in with the following default Super Admin account:

- **Email**: `admin@example.com`
- **Password**: `password123`
- **Role**: `ADMIN`

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

### Backend Build
```bash
cd backend
npm run build
npm run start:prod
```

### Frontend Build
```bash
cd frontend
npm run build
npm run preview
```

---

## 📄 License
Internal proprietary application for **PT Bank Syariah Indonesia Tbk (BSI)** - All Rights Reserved.
