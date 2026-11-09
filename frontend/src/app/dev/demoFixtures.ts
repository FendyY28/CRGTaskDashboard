/*
 * Demo mode: an in-memory fake backend.
 *
 * Enabled only by `npm run build:demo`, which aliases `app/services/api.ts` to
 * `app/dev/demoApi.ts` (see vite.config.ts). It answers the small set of
 * endpoints the UI calls, so the dashboard, timeline, Gantt, UAT testing, PIR,
 * analytics and audit trail can all be browsed with no NestJS server and no
 * PostgreSQL — nothing to deploy but static files.
 *
 * Writes live in memory for the session and are replayed into the audit trail,
 * so creating a project or an issue behaves like the real thing until reload.
 *
 * A normal `npm run build` never mentions the demoApi alias, so none of this is
 * bundled into the production app.
 */
import {
  PROJECT_STATUS,
  SDLC_PHASES,
  TEST_CASE_STATUS,
  TEST_CASE_TYPE,
} from "../constants/projectConstants";

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body ?? {}), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/* -------------------------------------------------------------------------- */
/* Seed data                                                                   */
/* -------------------------------------------------------------------------- */

type Phase = { id?: number; phaseName: string; cycle: number; startDate: string; deadline: string; status: string };

const phase = (phaseName: string, cycle: number, start: number, end: number, status: string): Phase => ({
  phaseName,
  cycle,
  startDate: iso(start),
  deadline: iso(end),
  status,
});

const DEMO_USER = {
  id: "u-head",
  name: "Ayu Lestari",
  email: "head@crg.demo",
  role: "HEAD",
  password: "password123",
  passwordChangedAt: iso(-12),
  createdAt: iso(-420),
};

const users = [
  DEMO_USER,
  { id: "u-officer", name: "Rizky Pratama", email: "officer@crg.demo", role: "OFFICER", password: "password123", passwordChangedAt: iso(-30), createdAt: iso(-260) },
  { id: "u-admin", name: "Dimas Saputra", email: "admin@crg.demo", role: "ADMIN", password: "password123", passwordChangedAt: iso(-4), createdAt: iso(-500) },
  { id: "u-sari", name: "Sari Wulandari", email: "sari@crg.demo", role: "OFFICER", password: "password123", passwordChangedAt: iso(-90), createdAt: iso(-140) },
  { id: "u-fajar", name: "Fajar Nugroho", email: "fajar@crg.demo", role: "OFFICER", password: "password123", passwordChangedAt: iso(-60), createdAt: iso(-95) },
];

const projects: any[] = [
  {
    id: "PRJ-001",
    name: "Mobile Banking Onboarding Revamp",
    pic: "Rizky Pratama",
    currentPhase: SDLC_PHASES.DEVELOPMENT,
    overallProgress: 62,
    status: PROJECT_STATUS.ON_TRACK,
    cycle: 1,
    createdAt: iso(-40),
    updatedAt: iso(-2),
    projectStartDate: iso(-40),
    projectDeadline: iso(40),
    sdlcPhases: [
      { ...phase(SDLC_PHASES.REQUIREMENT, 1, -40, -30, "completed"), notes: [
        { id: 1, content: "Scope agreed with business: e-KYC, selfie liveness, and BSI ID linking.", createdAt: iso(-33) },
      ] },
      phase(SDLC_PHASES.TF_MEETING, 1, -30, -24, "completed"),
      phase(SDLC_PHASES.DEVELOPMENT, 1, -24, 12, "in-progress"),
      phase(SDLC_PHASES.SIT, 1, 12, 24, "pending"),
      phase(SDLC_PHASES.UAT, 1, 24, 34, "pending"),
      phase(SDLC_PHASES.LIVE, 1, 34, 40, "pending"),
    ],
    weeklyProgress: [
      {
        id: 3,
        weekRange: "W43 (20 Oct - 26 Oct)",
        title: "e-KYC screens + liveness fallback",
        completed: 2,
        total: 3,
        progress: 67,
        tasks: [
          { id: 7, name: "Selfie capture screen", description: "Integrate liveness SDK", status: "completed", completedDate: iso(-1) },
          { id: 8, name: "BSI ID linking API", description: "Handle 409 duplicate", status: "completed", completedDate: iso(-1) },
          { id: 9, name: "Fallback for devices without camera", description: "", status: "in-progress", completedDate: null },
        ],
      },
      {
        id: 2,
        weekRange: "W42 (13 Oct - 19 Oct)",
        title: "Wire onboarding flow",
        completed: 2,
        total: 2,
        progress: 100,
        tasks: [
          { id: 5, name: "OTP verification screen", description: "", status: "completed", completedDate: iso(-8) },
          { id: 6, name: "Error-state copy review", description: "", status: "completed", completedDate: iso(-7) },
        ],
      },
    ],
    testCases: [
      { id: 11, title: "Successful onboarding with valid KTP", type: TEST_CASE_TYPE.POSITIVE, status: TEST_CASE_STATUS.PENDING, notes: null, isDeleted: false, defect: null },
      { id: 12, title: "Duplicate BSI ID is rejected", type: TEST_CASE_TYPE.NEGATIVE, status: TEST_CASE_STATUS.PENDING, notes: null, isDeleted: false, defect: null },
    ],
    issues: [],
    improvements: [
      {
        id: 1,
        noteId: "IMP-001",
        title: "Biometric fallback for older devices",
        reviewer: "Ayu Lestari",
        developer: "Rizky Pratama",
        feedback: "Roughly 8% of the install base has no front camera that meets the liveness threshold.",
        recommendations: "Offer PIN-based fallback and log the device model so we can size the impact.",
        priority: "high",
        createdDate: iso(-6),
      },
    ],
  },
  {
    id: "PRJ-002",
    name: "Sharia Financing Calculator",
    pic: "Ayu Lestari",
    currentPhase: SDLC_PHASES.SIT,
    overallProgress: 78,
    status: PROJECT_STATUS.AT_RISK,
    cycle: 2,
    createdAt: iso(-60),
    updatedAt: iso(-1),
    projectStartDate: iso(-60),
    projectDeadline: iso(9),
    sdlcPhases: [
      phase(SDLC_PHASES.REQUIREMENT, 2, -20, -14, "completed"),
      phase(SDLC_PHASES.TF_MEETING, 2, -14, -10, "completed"),
      phase(SDLC_PHASES.DEVELOPMENT, 2, -10, -1, "completed"),
      phase(SDLC_PHASES.SIT, 2, -1, 9, "in-progress"),
      phase(SDLC_PHASES.UAT, 2, 9, 20, "pending"),
      phase(SDLC_PHASES.LIVE, 2, 20, 28, "pending"),
    ],
    weeklyProgress: [
      {
        id: 4,
        weekRange: "W43 (20 Oct - 26 Oct)",
        title: "Rounding fixes in margin engine",
        completed: 1,
        total: 2,
        progress: 50,
        tasks: [
          { id: 10, name: "Fix double rounding", description: "Last instalment was off by 1", status: "completed", completedDate: iso(-2) },
          { id: 13, name: "Regression on 12/24/36-month tenors", description: "", status: "in-progress", completedDate: null },
        ],
      },
    ],
    testCases: [
      { id: 2, title: "Calculate murabahah margin", type: TEST_CASE_TYPE.POSITIVE, status: TEST_CASE_STATUS.PASS, notes: null, isDeleted: false, defect: null },
      {
        id: 3,
        title: "Zero down payment is rejected",
        type: TEST_CASE_TYPE.POSITIVE,
        status: TEST_CASE_STATUS.FAIL,
        notes: "Validation allows 0 for musyarakah mutanaqisah",
        isDeleted: false,
        defect: { id: 1, severity: "high", description: "Zero DP accepted on MMQ contract", status: "open" },
      },
      { id: 4, title: "Invalid tenor input", type: TEST_CASE_TYPE.NEGATIVE, status: TEST_CASE_STATUS.PENDING, notes: null, isDeleted: false, defect: null },
      { id: 5, title: "Empty customer segment", type: TEST_CASE_TYPE.NEGATIVE, status: TEST_CASE_STATUS.PASS, notes: null, isDeleted: false, defect: null },
      { id: 6, title: "Legacy flat-rate screen (taken out)", type: TEST_CASE_TYPE.NEGATIVE, status: TEST_CASE_STATUS.PENDING, notes: null, isDeleted: true, deletedBy: "Dimas Saputra", takeoutReason: "Screen removed in cycle 2", defect: null },
    ],
    issues: [
      {
        id: 1,
        issueId: "ISS-101",
        title: "Margin calculation off by one rupiah",
        description: "Rounding applied twice on the last instalment for 36-month tenors.",
        impactArea: "Calculation",
        priority: "critical",
        status: "open",
        reportedBy: "Ayu Lestari",
        reportedDate: iso(-3),
        projectId: "PRJ-002",
      },
      {
        id: 2,
        issueId: "ISS-102",
        title: "Print preview cuts off the footer",
        description: "On A4 landscape the disclaimer row is clipped.",
        impactArea: "Reporting",
        priority: "medium",
        status: "in-progress",
        reportedBy: "Sari Wulandari",
        reportedDate: iso(-5),
        projectId: "PRJ-002",
      },
    ],
    improvements: [],
  },
  {
    id: "PRJ-003",
    name: "CRG Reporting Data Mart",
    pic: "Dimas Saputra",
    currentPhase: SDLC_PHASES.UAT,
    overallProgress: 55,
    status: PROJECT_STATUS.OVERDUE,
    cycle: 1,
    createdAt: iso(-95),
    updatedAt: iso(-4),
    projectStartDate: iso(-95),
    projectDeadline: iso(-3),
    sdlcPhases: [
      phase(SDLC_PHASES.REQUIREMENT, 1, -95, -86, "completed"),
      phase(SDLC_PHASES.TF_MEETING, 1, -86, -80, "completed"),
      phase(SDLC_PHASES.DEVELOPMENT, 1, -80, -40, "completed"),
      phase(SDLC_PHASES.SIT, 1, -40, -18, "completed"),
      phase(SDLC_PHASES.UAT, 1, -18, -3, "in-progress"),
      phase(SDLC_PHASES.LIVE, 1, -3, 8, "pending"),
    ],
    weeklyProgress: [
      {
        id: 5,
        weekRange: "W43 (20 Oct - 26 Oct)",
        title: "UAT defect burn-down",
        completed: 0,
        total: 2,
        progress: 0,
        tasks: [
          { id: 14, name: "Fix export timeout", description: "Stalls above 5k rows", status: "in-progress", completedDate: null },
          { id: 15, name: "Monthly snapshot totals", description: "", status: "pending", completedDate: null },
        ],
      },
    ],
    testCases: [
      {
        id: 7,
        title: "Monthly snapshot totals",
        type: TEST_CASE_TYPE.POSITIVE,
        status: TEST_CASE_STATUS.FAIL,
        notes: "Mismatch on December",
        isDeleted: false,
        defect: { id: 2, severity: "critical", description: "December aggregation drops the last business day", status: "open" },
      },
      { id: 8, title: "Export > 10k rows completes", type: TEST_CASE_TYPE.POSITIVE, status: TEST_CASE_STATUS.FAIL, notes: "Times out after 30s", isDeleted: false, defect: { id: 3, severity: "high", description: "Export endpoint timeout", status: "in-progress" } },
      { id: 9, title: "CSV delimiter matches locale", type: TEST_CASE_TYPE.NEGATIVE, status: TEST_CASE_STATUS.PASS, notes: null, isDeleted: false, defect: null },
    ],
    issues: [
      {
        id: 3,
        issueId: "ISS-103",
        title: "Export stalls for large customers",
        description: "Anything above ~5,000 rows never finishes.",
        impactArea: "Performance",
        priority: "high",
        status: "resolved",
        reportedBy: "Fajar Nugroho",
        reportedDate: iso(-12),
        projectId: "PRJ-003",
      },
      {
        id: 4,
        issueId: "ISS-104",
        title: "Dashboard cardinality warning",
        description: "Power BI flags a many-to-many relationship on the branch dimension.",
        impactArea: "Data model",
        priority: "low",
        status: "open",
        reportedBy: "Dimas Saputra",
        reportedDate: iso(-9),
        projectId: "PRJ-003",
      },
    ],
    improvements: [],
  },
  {
    id: "PRJ-004",
    name: "Customer Complaint Portal",
    pic: "Sari Wulandari",
    currentPhase: SDLC_PHASES.LIVE,
    overallProgress: 100,
    status: PROJECT_STATUS.COMPLETED,
    cycle: 1,
    createdAt: iso(-150),
    updatedAt: iso(-5),
    projectStartDate: iso(-150),
    projectDeadline: iso(-8),
    sdlcPhases: [
      phase(SDLC_PHASES.REQUIREMENT, 1, -150, -140, "completed"),
      phase(SDLC_PHASES.TF_MEETING, 1, -140, -132, "completed"),
      phase(SDLC_PHASES.DEVELOPMENT, 1, -132, -90, "completed"),
      phase(SDLC_PHASES.SIT, 1, -90, -60, "completed"),
      phase(SDLC_PHASES.UAT, 1, -60, -20, "completed"),
      phase(SDLC_PHASES.LIVE, 1, -20, -8, "completed"),
    ],
    weeklyProgress: [],
    testCases: [],
    issues: [
      {
        id: 5,
        issueId: "ISS-105",
        title: "Attachment upload fails on Android 9",
        description: "The file picker returns an empty URI on some Samsung devices.",
        impactArea: "Mobile",
        priority: "medium",
        status: "in-progress",
        reportedBy: "Sari Wulandari",
        reportedDate: iso(-6),
        projectId: "PRJ-004",
      },
    ],
    improvements: [
      {
        id: 2,
        noteId: "IMP-002",
        title: "Pre-aggregate monthly snapshots",
        reviewer: "Ayu Lestari",
        developer: "Dimas Saputra",
        feedback: "Users mostly look at monthly rollups, but every view recomputes from raw rows.",
        recommendations: "Materialise a monthly snapshot table and refresh it nightly.",
        priority: "medium",
        createdDate: iso(-10),
      },
    ],
  },
  {
    id: "PRJ-005",
    name: "Risk Scoring Engine v3",
    pic: "Fajar Nugroho",
    currentPhase: SDLC_PHASES.REQUIREMENT,
    overallProgress: 18,
    status: PROJECT_STATUS.IN_PROGRESS,
    cycle: 1,
    createdAt: iso(-8),
    updatedAt: iso(-1),
    projectStartDate: iso(-8),
    projectDeadline: iso(70),
    sdlcPhases: [
      phase(SDLC_PHASES.REQUIREMENT, 1, -8, 14, "in-progress"),
      phase(SDLC_PHASES.TF_MEETING, 1, 14, 22, "pending"),
      phase(SDLC_PHASES.DEVELOPMENT, 1, 22, 50, "pending"),
      phase(SDLC_PHASES.SIT, 1, 50, 60, "pending"),
      phase(SDLC_PHASES.UAT, 1, 60, 66, "pending"),
      phase(SDLC_PHASES.LIVE, 1, 66, 70, "pending"),
    ],
    weeklyProgress: [],
    testCases: [],
    issues: [],
    improvements: [],
  },
];

const auditLogs: any[] = [
  {
    id: "6",
    action: "UPDATE_TEST_CASE",
    details: "Marked “Export > 10k rows completes” as FAIL",
    userName: "Dimas Saputra",
    createdAt: iso(-0.2),
    project: { id: "PRJ-003", name: "CRG Reporting Data Mart" },
  },
  {
    id: "5",
    action: "UPDATE_PROJECT",
    details: "Updated Development progress to 62%",
    userName: "Rizky Pratama",
    createdAt: iso(-1),
    project: { id: "PRJ-001", name: "Mobile Banking Onboarding Revamp" },
  },
  {
    id: "4",
    action: "CHANGE_PHASE",
    details: "Moved SIT to In Progress",
    userName: "Ayu Lestari",
    createdAt: iso(-2),
    project: { id: "PRJ-002", name: "Sharia Financing Calculator" },
  },
  {
    id: "3",
    action: "CREATE_ISSUE",
    details: "Report Issue baru: Margin calculation off by one rupiah (ISS-101)",
    userName: "Ayu Lestari",
    createdAt: iso(-3),
    project: { id: "PRJ-002", name: "Sharia Financing Calculator" },
  },
  {
    id: "2",
    action: "ADD_WEEKLY_LOG",
    details: "Logged W43 wrap-up",
    userName: "Dimas Saputra",
    createdAt: iso(-5),
    project: { id: "PRJ-003", name: "CRG Reporting Data Mart" },
  },
  {
    id: "1",
    action: "TAKEOUT_TEST_CASE",
    details: "Took out “Legacy flat-rate screen”",
    userName: "Dimas Saputra",
    createdAt: iso(-8),
    project: { id: "PRJ-002", name: "Sharia Financing Calculator" },
  },
  {
    id: "0",
    action: "CREATE_PROJECT",
    details: "Created project Risk Scoring Engine v3 (PRJ-005)",
    userName: "Fajar Nugroho",
    createdAt: iso(-8),
    project: { id: "PRJ-005", name: "Risk Scoring Engine v3" },
  },
];

/* -------------------------------------------------------------------------- */
/* Session state                                                               */
/* -------------------------------------------------------------------------- */

let signedIn = DEMO_USER;
let auditSeq = 100;

const findProject = (id: string) => projects.find((p) => p.id === id);

const log = (action: string, details: string, projectId?: string) => {
  const project = findProject(projectId ?? "");
  auditLogs.unshift({
    id: String(auditSeq++),
    action,
    details,
    userName: signedIn.name,
    createdAt: new Date().toISOString(),
    project: project ? { id: project.id, name: project.name } : null,
  });
};

/** A project as Prisma's `PROJECT_INCLUDE` would return it. */
const projectView = (project: any) => ({
  ...project,
  issues: projects.flatMap((p) => p.issues).filter((i) => i.projectId === project.id),
});

const nextSeqId = (prefix: string, existing: string[]) => {
  const numbers = existing
    .map((id) => Number(String(id).split("-")[1]))
    .filter((n) => Number.isFinite(n));
  return `${prefix}-${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
};

/** A brand-new project, phase 1 in progress — shared by create and next-cycle. */
const freshProject = (overrides: Record<string, unknown>): any => {
  // Only a brand-new project builds its phases here; callers that already have
  // phase rows (e.g. next-cycle) pass `sdlcPhases` and keep their ids.
  const sdlcPhases = (overrides.sdlcPhases as Phase[] | undefined) ?? freshPhases(1);
  return {
    overallProgress: 0,
    status: PROJECT_STATUS.IN_PROGRESS,
    cycle: 1,
    weeklyProgress: [],
    testCases: [],
    issues: [],
    improvements: [],
    ...overrides,
    sdlcPhases,
  };
};

const freshPhases = (cycle: number) => [
  phaseNumbered(SDLC_PHASES.REQUIREMENT, cycle, 0, 14, "in-progress"),
  phaseNumbered(SDLC_PHASES.TF_MEETING, cycle, 14, 22, "pending"),
  phaseNumbered(SDLC_PHASES.DEVELOPMENT, cycle, 22, 50, "pending"),
  phaseNumbered(SDLC_PHASES.SIT, cycle, 50, 60, "pending"),
  phaseNumbered(SDLC_PHASES.UAT, cycle, 60, 66, "pending"),
  phaseNumbered(SDLC_PHASES.LIVE, cycle, 66, 70, "pending"),
];

let phaseSeq = 0;
/** A phase row with the Prisma id the UI needs (phase notes are keyed by it). */
const phaseNumbered = (phaseName: string, cycle: number, start: number, end: number, status: string): Phase =>
  ({ id: ++phaseSeq, ...phase(phaseName, cycle, start, end, status) }) as Phase;

/* -------------------------------------------------------------------------- */
/* Routing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Answer a request the way the NestJS API would. Returns `undefined` for routes
 * this demo does not model, so the caller replies `{ success: true }`.
 */
function route(method: string, path: string, query: URLSearchParams, body: any): unknown {
  /* ---- auth ------------------------------------------------------------- */
  if (path === "/auth/login") {
    const email = String(body?.email ?? "").toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== body?.password) {
      return ok({ message: "Email atau password salah. (demo: head@crg.demo / password123)" }, 401);
    }
    signedIn = user;
    const token = [
      "demo",
      btoa(JSON.stringify({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 })),
      "sig",
    ].join(".");
    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, passwordChangedAt: user.passwordChangedAt },
    };
  }

  const me = () => ({
    id: signedIn.id,
    name: signedIn.name,
    email: signedIn.email,
    role: signedIn.role,
    passwordChangedAt: signedIn.passwordChangedAt,
  });

  if (path === "/auth/me") return me();
  if (path === "/auth/request-change-password-otp") return { message: "Kode OTP demo dikirim (gunakan 123456)." };
  if (path === "/auth/forgot-password") return { message: "Kode OTP demo dikirim (gunakan 123456)." };
  if (path === "/auth/reset-password") return { message: "Password berhasil direset (demo)." };
  if (path === "/auth/change-password") {
    signedIn.passwordChangedAt = new Date().toISOString();
    return { message: "Password berhasil diubah (demo)." };
  }
  if (path === "/auth/validate-email" || path === "/auth/verify-email" || path === "/auth/register") {
    return { success: true };
  }

  const adminResetMatch = path.match(/^\/auth\/([^/]+)\/admin-reset-password$/);
  if (adminResetMatch) {
    const user = users.find((u) => u.id === adminResetMatch[1]);
    if (!user) return ok({ message: "User not found" }, 404);
    log("ADMIN_RESET_PASSWORD", `Reset password user ${user.email}`);
    return { message: "Password baru sudah dikirim ke email (demo)." };
  }

  /* ---- users ------------------------------------------------------------ */
  if (path === "/users") {
    if (method === "POST") {
      // The real service generates a password and emails it; the demo just says so.
      const user = {
        id: `u-${Date.now()}`,
        name: body?.name ?? "New user",
        email: body?.email ?? "new.user@crg.demo",
        role: body?.role ?? "OFFICER",
        password: "password123",
        passwordChangedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      log("CREATE_USER", `Membuat user ${user.email} (${user.role})`);
      return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
    }
    return users.map(({ password, ...u }) => u);
  }

  const userMatch = path.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const id = userMatch[1];
    const user = users.find((u) => u.id === id);
    if (!user) return ok({ message: "User not found" }, 404);
    if (method === "PATCH") {
      // Name and email are locked server-side; only the role can change.
      user.role = body?.role ?? user.role;
      log("UPDATE_USER", `Mengubah role ${user.email} menjadi ${user.role}`);
      return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
    }
    users.splice(users.indexOf(user), 1);
    log("DELETE_USER", `Menghapus user ${user.email}`);
    return { success: true };
  }

  /* ---- audit ------------------------------------------------------------ */
  if (path === "/audit/meta/options") {
    return {
      users: users.map((u) => ({ id: u.id, name: u.name })),
      actions: [...new Set(auditLogs.map((l) => l.action))],
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    };
  }

  if (path === "/audit/export") return auditLogs;

  if (path === "/audit") {
    const page = Number(query.get("page") ?? 1);
    const limit = Number(query.get("limit") ?? 10);
    const search = (query.get("search") ?? "").toLowerCase();
    const projectId = query.get("projectId");
    const action = query.get("action");

    const filtered = auditLogs.filter((l) => {
      if (search && !`${l.details} ${l.action} ${l.userName} ${l.project?.name ?? ""}`.toLowerCase().includes(search)) return false;
      if (projectId && projectId !== "ALL" && l.project?.id !== projectId) return false;
      if (action && action !== "ALL" && l.action !== action) return false;
      return true;
    });

    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    };
  }

  /* ---- PIR: issues & improvements --------------------------------------- */
  if (path === "/project/issue" && method === "POST") {
    const project = findProject(body?.projectId);
    if (!project) return ok({ message: "Project not found" }, 404);
    const issue = {
      id: Math.max(0, ...projects.flatMap((p) => p.issues).map((i: any) => i.id)) + 1,
      issueId: nextSeqId("ISS", projects.flatMap((p) => p.issues).map((i: any) => i.issueId)),
      title: body?.title ?? "Untitled issue",
      description: body?.description ?? "",
      impactArea: body?.impactArea || "General",
      priority: body?.priority ?? "medium",
      status: "open",
      reportedBy: body?.reportedBy || signedIn.name,
      reportedDate: new Date().toISOString(),
      projectId: project.id,
    };
    project.issues.unshift(issue);
    log("CREATE_ISSUE", `Report Issue baru: ${issue.title} (${issue.issueId})`, project.id);
    return issue;
  }

  if (path === "/project/issue") {
    return projects.flatMap((p) =>
      p.issues.map((i: any) => ({ ...i, project: findProject(i.projectId) ? { name: findProject(i.projectId).name } : null })),
    );
  }

  const issueMatch = path.match(/^\/project\/issue\/(\d+)$/);
  if (issueMatch) {
    const id = Number(issueMatch[1]);
    const project = projects.find((p) => p.issues.some((i: any) => i.id === id));
    const issue = project?.issues.find((i: any) => i.id === id);
    if (!project || !issue) return ok({ message: "Issue not found" }, 404);
    if (method === "PATCH") {
      issue.status = body?.status ?? issue.status;
      log("UPDATE_ISSUE", `Update status Issue ${issue.issueId} menjadi ${issue.status}`, project.id);
      return issue;
    }
    project.issues = project.issues.filter((i: any) => i.id !== id);
    log("DELETE_ISSUE", `Menghapus Issue: ${issue.title}`, project.id);
    return issue;
  }

  if (path === "/project/improvement" && method === "POST") {
    const project = findProject(body?.projectId);
    if (!project) return ok({ message: "Project not found" }, 404);
    const imp = {
      id: Math.max(0, ...projects.flatMap((p) => p.improvements).map((i: any) => i.id)) + 1,
      noteId: nextSeqId("IMP", projects.flatMap((p) => p.improvements).map((i: any) => i.noteId)),
      title: body?.title ?? "Optimization note",
      reviewer: body?.reviewer ?? signedIn.name,
      developer: body?.developer ?? "-",
      feedback: body?.feedback ?? "",
      recommendations: body?.recommendations ?? "",
      priority: body?.priority ?? "medium",
      createdDate: new Date().toISOString(),
    };
    project.improvements.unshift(imp);
    log("ADD_IMPROVEMENT", `Menambah catatan improvement untuk project (${imp.noteId})`, project.id);
    return imp;
  }

  const impMatch = path.match(/^\/project\/improvement\/(\d+)$/);
  if (impMatch) {
    const id = Number(impMatch[1]);
    const project = projects.find((p) => p.improvements.some((i: any) => i.id === id));
    const imp = project?.improvements.find((i: any) => i.id === id);
    if (!project || !imp) return ok({ message: "Improvement not found" }, 404);
    project.improvements = project.improvements.filter((i: any) => i.id !== id);
    log("DELETE_IMPROVEMENT", `Menghapus Ide Optimalisasi: ${imp.title}`, project.id);
    return imp;
  }

  /* ---- testing ---------------------------------------------------------- */
  if (path === "/project/testing-status") {
    return projects.map((p) => ({ id: p.id, name: p.name, currentPhase: p.currentPhase, testCases: p.testCases }));
  }

  const testCasesMatch = path.match(/^\/project\/([^/]+)\/test-cases$/);
  if (testCasesMatch) {
    return findProject(testCasesMatch[1])?.testCases ?? [];
  }

  if (path === "/project/test-cases" && method === "POST") {
    const project = findProject(body?.projectId);
    if (!project) return ok({ message: "Project not found" }, 404);
    const testCase = {
      id: Math.max(0, ...projects.flatMap((p) => p.testCases).map((t: any) => t.id)) + 1,
      title: body?.title ?? "Untitled test case",
      type: body?.type ?? TEST_CASE_TYPE.POSITIVE,
      status: TEST_CASE_STATUS.PENDING,
      notes: body?.notes ?? null,
      isDeleted: false,
      defect: null,
    };
    project.testCases.push(testCase);
    log("CREATE_TEST_CASE", `Menambah test case: ${testCase.title}`, project.id);
    return testCase;
  }

  const testCaseMatch = path.match(/^\/project\/test-cases\/(\d+)$/);
  if (testCaseMatch) {
    const id = Number(testCaseMatch[1]);
    const project = projects.find((p) => p.testCases.some((t: any) => t.id === id));
    const testCase = project?.testCases.find((t: any) => t.id === id);
    if (!project || !testCase) return ok({ message: "Test case not found" }, 404);
    if (method === "PATCH") {
      Object.assign(testCase, body ?? {});
      log("UPDATE_TEST_CASE", `Memperbarui test case: ${testCase.title}`, project.id);
      return testCase;
    }
    testCase.isDeleted = true;
    log("TAKEOUT_TEST_CASE", `Mengeluarkan test case: ${testCase.title}`, project.id);
    return testCase;
  }

  /* ---- weekly logs & tasks ---------------------------------------------- */
  if (path === "/project/log" && method === "POST") {
    const project = findProject(body?.projectId);
    if (!project) return ok({ message: "Project not found" }, 404);
    const incoming: any[] = Array.isArray(body?.tasks) ? body.tasks : [];
    let nextTaskId = Math.max(0, ...projects.flatMap((p) => p.weeklyProgress).flatMap((w: any) => w.tasks).map((t: any) => t.id));
    const week = {
      id: Math.max(0, ...projects.flatMap((p) => p.weeklyProgress).map((w: any) => w.id)) + 1,
      weekRange: body?.weekRange ?? "This week",
      title: body?.title ?? "",
      completed: 0,
      total: incoming.length,
      progress: 0,
      tasks: incoming.map((t) => ({
        id: ++nextTaskId,
        name: t.name ?? t.taskName ?? "Task",
        description: t.description ?? "",
        status: "pending",
        completedDate: null,
      })),
    };
    project.weeklyProgress.unshift(week);
    log("ADD_WEEKLY_LOG", `Menambah catatan mingguan ${week.weekRange}`, project.id);
    return week;
  }

  const taskCreateMatch = path.match(/^\/project\/log\/(\d+)\/task$/);
  if (taskCreateMatch) {
    const weekId = Number(taskCreateMatch[1]);
    const project = projects.find((p) => p.weeklyProgress.some((w: any) => w.id === weekId));
    const week = project?.weeklyProgress.find((w: any) => w.id === weekId);
    if (!project || !week) return ok({ message: "Weekly log not found" }, 404);
    const task = {
      id: Math.max(0, ...projects.flatMap((p) => p.weeklyProgress).flatMap((w: any) => w.tasks).map((t: any) => t.id)) + 1,
      name: body?.taskName ?? "New task",
      description: body?.description ?? "",
      status: "pending",
      completedDate: null,
    };
    week.tasks.push(task);
    week.total = week.tasks.length;
    week.completed = week.tasks.filter((t: any) => t.status === "completed").length;
    week.progress = week.total ? Math.round((week.completed / week.total) * 100) : 0;
    log("ADD_TASK", `Menambah task: ${task.name}`, project.id);
    return task;
  }

  const toggleMatch = path.match(/^\/project\/task\/(\d+)\/toggle$/);
  if (toggleMatch) {
    return withTask(Number(toggleMatch[1]), (project, week, task) => {
      task.status = task.status === "completed" ? "pending" : "completed";
      task.completedDate = task.status === "completed" ? new Date().toISOString() : null;
      week.completed = week.tasks.filter((t: any) => t.status === "completed").length;
      week.progress = week.total ? Math.round((week.completed / week.total) * 100) : 0;
      log("TOGGLE_TASK", `Mengubah status task: ${task.name}`, project.id);
      return task;
    });
  }

  const deleteTaskMatch = path.match(/^\/project\/task\/(\d+)$/);
  if (deleteTaskMatch) {
    return withTask(Number(deleteTaskMatch[1]), (project, week, task) => {
      week.tasks = week.tasks.filter((t: any) => t.id !== task.id);
      week.total = week.tasks.length;
      week.completed = week.tasks.filter((t: any) => t.status === "completed").length;
      week.progress = week.total ? Math.round((week.completed / week.total) * 100) : 0;
      log("DELETE_TASK", `Menghapus task: ${task.name}`, project.id);
      return task;
    });
  }

  // Destructive on the real API (`remove`), so it belongs before the delete.
  const logUpdateMatch = path.match(/^\/project\/log\/(\d+)$/);
  if (logUpdateMatch) {
    const id = Number(logUpdateMatch[1]);
    for (const project of projects) {
      const week = project.weeklyProgress.find((w: any) => w.id === id);
      if (!week) continue;
      if (body?.weekRange !== undefined) week.weekRange = body.weekRange;
      if (body?.title !== undefined) week.title = body.title;
      log("UPDATE_WEEKLY_LOG", `Memperbarui catatan mingguan ${week.weekRange}`, project.id);
      return week;
    }
    return ok({ message: "Weekly log not found" }, 404);
  }

  const deleteLogMatch = path.match(/^\/project\/log\/(\d+)$/);
  if (deleteLogMatch) {
    const id = Number(deleteLogMatch[1]);
    for (const project of projects) {
      const week = project.weeklyProgress.find((w: any) => w.id === id);
      if (!week) continue;
      project.weeklyProgress = project.weeklyProgress.filter((w: any) => w.id !== id);
      log("DELETE_WEEKLY_LOG", `Menghapus catatan mingguan ${week.weekRange}`, project.id);
      return week;
    }
    return ok({ message: "Weekly log not found" }, 404);
  }

  /* ---- phase notes ------------------------------------------------------ */
  const phaseNoteMatch = path.match(/^\/project\/phase\/(\d+)\/note$/);
  if (phaseNoteMatch) {
    const id = Number(phaseNoteMatch[1]);
    for (const project of projects) {
      for (const ph of project.sdlcPhases) {
        if (ph.id !== id) continue;
        ph.notes = ph.notes ?? [];
        const note = {
          id: Math.max(0, ...ph.notes.map((n: any) => n.id)) + 1,
          content: body?.content ?? "",
          createdBy: signedIn.name,
          createdAt: new Date().toISOString(),
        };
        ph.notes.unshift(note);
        log("ADD_PHASE_NOTE", `Menambah catatan fase ${ph.phaseName}`, project.id);
        return note;
      }
    }
    return ok({ message: "Phase not found" }, 404);
  }

  const deletePhaseNoteMatch = path.match(/^\/project\/phase\/note\/(\d+)$/);
  if (deletePhaseNoteMatch) {
    const id = Number(deletePhaseNoteMatch[1]);
    for (const project of projects) {
      for (const ph of project.sdlcPhases) {
        const note = (ph.notes ?? []).find((n: any) => n.id === id);
        if (!note) continue;
        ph.notes = ph.notes.filter((n: any) => n.id !== id);
        log("DELETE_PHASE_NOTE", `Menghapus catatan fase ${ph.phaseName}`, project.id);
        return note;
      }
    }
    return ok({ message: "Note not found" }, 404);
  }

  /* ---- projects --------------------------------------------------------- */
  const nextCycleMatch = path.match(/^\/project\/([^/]+)\/next-cycle$/);
  if (nextCycleMatch) {
    const project = findProject(nextCycleMatch[1]);
    if (!project) return ok({ message: "Project not found" }, 404);
    project.cycle = (project.cycle ?? 1) + 1;
    project.overallProgress = 0;
    project.currentPhase = SDLC_PHASES.REQUIREMENT;
    project.status = PROJECT_STATUS.IN_PROGRESS;
    project.sdlcPhases = freshPhases(project.cycle);
    log("NEXT_CYCLE", `Memulai cycle ${project.cycle}`, project.id);
    return projectView(project);
  }

  if (path === "/project" && method === "POST") {
    const project = freshProject({
      id: nextSeqId("PRJ", projects.map((p) => p.id)),
      name: body?.name ?? "New project",
      pic: body?.pic ?? signedIn.name,
      currentPhase: SDLC_PHASES.REQUIREMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectStartDate: body?.projectStartDate ?? new Date().toISOString(),
      projectDeadline: body?.projectDeadline ?? iso(60),
      sdlcPhases: freshPhases(1),
    });
    projects.unshift(project);
    log("CREATE_PROJECT", `Membuat project ${project.name} (${project.id})`, project.id);
    return projectView(project);
  }

  const projectMatch = path.match(/^\/project\/([^/]+)$/);
  if (projectMatch) {
    const project = findProject(projectMatch[1]);
    if (!project) return ok({ message: "Project not found" }, 404);
    if (method === "PATCH") {
      Object.assign(project, body ?? {}, { updatedAt: new Date().toISOString() });
      log("UPDATE_PROJECT", `Memperbarui project ${project.name}`, project.id);
      return projectView(project);
    }
    if (method === "DELETE") {
      projects.splice(projects.indexOf(project), 1);
      log("DELETE_PROJECT", `Menghapus project ${project.name}`);
      return project;
    }
    return projectView(project);
  }

  if (path === "/project") return projects.map(projectView);

  return undefined;
}

/** Find a task by id across every project/week and run `fn` on it. */
function withTask(
  id: number,
  fn: (project: any, week: any, task: any) => unknown,
): unknown {
  for (const project of projects) {
    for (const week of project.weeklyProgress) {
      const task = week.tasks.find((t: any) => t.id === id);
      if (task) return fn(project, week, task);
    }
  }
  return ok({ message: "Task not found" }, 404);
}

/* -------------------------------------------------------------------------- */
/* Demo build entry points                                                     */
/* -------------------------------------------------------------------------- */

export type DemoResult = { status: number; payload: unknown };

/**
 * Answer one API call. Called by `app/dev/demoApi.ts`, which replaces the real
 * API client in a demo build (see vite.config.ts).
 *
 * Returns the HTTP status plus the body, so the caller can reproduce the real
 * client's error behaviour (throw with the server's message).
 */
export function demoRoute(
  method: string,
  path: string,
  query: URLSearchParams,
  body?: unknown,
): DemoResult {
  const result = route(method.toUpperCase(), path, query, body as any);
  // An unmodelled route replies { success: true }, like the API client's
  // tolerance for endpoints this demo does not model. Writes are warned about,
  // because the UI would otherwise show an optimistic success and then reload
  // data that never changed.
  if (result === undefined && method.toUpperCase() !== "GET") {
    console.warn(`[demo] ${method.toUpperCase()} ${path} belum dimodelkan; tidak ada data yang berubah.`);
  }
  if (result instanceof Response) {
    return { status: result.status, payload: undefined };
  }
  return { status: 200, payload: result ?? { success: true } };
}
