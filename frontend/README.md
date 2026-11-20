# 🖥️ BSI CRG Task Dashboard — Frontend

React 18 + Vite 6 single-page app for the BSI CRG Task & Project Monitoring Dashboard.

> New here? Start with the [root README](../README.md#-run-it-locally) — `npm run setup` then `npm run dev` from the repository root sets up and starts both apps.

---

## Requirements

- Node.js **20+**
- A running backend API (default `http://localhost:3000`) — except in **demo mode**, which needs nothing.

## Environment variables

`frontend/.env` (git-ignored, created from `.env.example` by `npm run env:init`):

```env
VITE_API_URL="http://localhost:3000"
```

| Variable | Required | Notes |
| :--- | :---: | :--- |
| `VITE_API_URL` | — | Read in `src/lib/utils.ts` (`API_URL`) and used by `src/app/services/api.ts`. Defaults to `http://localhost:3000` when unset. |

Two things to remember about Vite env vars:

1. Only names starting with `VITE_` are exposed to the browser.
2. They are **inlined at build/dev-server start** — change the file, then restart `npm run dev`.

The API URL is used **by the browser**, so it must be reachable from the machine viewing the app (never a Docker service name such as `http://backend:3000`). When deploying, also add the app's origin to `CORS_ORIGINS` in `backend/.env`.

## Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Vite dev server on <http://localhost:5173> with HMR. |
| `npm run build` | Type-check (`tsc`) then production build → `dist/`. |
| `npm run build:demo` | Demo build (`--mode demo`) → `dist-demo/`, entry `demo.html`. |
| `npm run preview` | Serve the production build (use `-- --outDir dist-demo` for the demo). |
| `npm test` | Vitest suite (jsdom + Testing Library). |
| `npm run test:watch` | Vitest in watch mode. |

## Demo mode (no backend needed)

`npm run build:demo` compiles the app against an **in-memory fake backend**:

- `vite.config.ts` aliases `src/app/services/api.ts` → `src/app/dev/demoApi.ts` (via the `demoApiAlias` plugin).
- `demoApi.ts` answers every request from `src/app/dev/demoFixtures.ts` — projects, tasks, test cases, issues, users, analytics.
- `src/main-demo.tsx` boots `DemoApp`, which pre-seeds a session (role `HEAD`) so the dashboard opens directly.
- The entry HTML is `demo.html`, so a normal `npm run build` is never affected and never bundles the fixtures.

```bash
npm run build:demo
npm exec -- yes -- vite preview --outDir dist-demo
# → http://localhost:4173/demo.html
```

## Source layout

```
src/
├── app/
│   ├── components/     UI primitives (Radix/shadcn style), layout, modals
│   ├── constants/      THEME, navigation config per role
│   ├── dev/            demo backend: demoApi.ts, demoFixtures.ts, DemoApp.tsx
│   ├── hooks/          data hooks (projects, analytics, test cases, PIR…)
│   ├── pages/          dashboard, timeline, testing, PIR, analytics, auth, settings, users
│   ├── services/api.ts fetch wrapper: attaches the JWT, normalises errors
│   └── types/          shared interfaces
├── assets/             logo & images
├── locales/            id.json · en.json (i18next)
├── lib/utils.ts        API_URL, token helpers, role helpers
├── App.tsx             routing + route guards + layout
├── main.tsx            real app bootstrap
└── main-demo.tsx       demo bootstrap
```

## Auth in the browser

| Key (`localStorage`) | Purpose |
| :--- | :--- |
| `auth_token` | JWT returned by `POST /auth/login`; `services/api.ts` sends it as `Authorization: Bearer …`. |
| `user_role`, `user_name`, `user_email` | Profile shown in the header; `ADMIN`/`OFFICER`/`HEAD` drive navigation and route guards. |
| `password_changed_at` | Used by `PasswordWarningModal` to warn during the last 7 days of the 180-day policy. |
| `remember_me` | Optional e-mail prefill on the login page. |

`Header.tsx` clears every auth key above on logout (except the `remember_me` e-mail prefill). In demo mode the values are seeded by `DemoApp`.

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| Requests fail with a network error | Check `VITE_API_URL`, that the backend is running, and restart `npm run dev` after editing `.env`. |
| CORS error in the console | Add this app's origin to `CORS_ORIGINS` in `backend/.env` and restart the backend. |
| Blank page on the demo preview | Open `demo.html`, not the bare `http://localhost:4173/`. |
| Type errors after pulling | `npm install` then `npm run build`. |
