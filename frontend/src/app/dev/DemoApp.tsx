/*
 * Entry point for `npm run build:demo`.
 *
 * Replaces `app/App.tsx` in a demo build (see vite.config.ts). It is identical
 * to the real app except that the public/protected route wrappers are replaced
 * by pass-throughs: a demo build has no login gate, so a visitor lands straight
 * on the dashboard with a seeded HEAD session.
 *
 * The demo session is only seeded here, never in the real app, so a normal
 * build cannot be signed in by merely visiting it.
 */
import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

import { Header } from "../components/layouts/Header";
import { Footer } from "../components/layouts/Footer";
import { PasswordWarningModal } from "../components/modals/PasswordWarningModal";
import { TestingConsole } from "../components/features/testing/TestingConsole";
import { SDLC_PHASES } from "../constants/projectConstants";

const DEMO_ROLE = "HEAD";

// Seed the session before anything renders. `hasValidAuthToken` only reads
// localStorage, and the demo API answers /auth/me from memory.
const token = [
  "demo",
  btoa(
    JSON.stringify({
      sub: "u-head",
      role: DEMO_ROLE,
      exp: Math.floor(Date.now() / 1000) + 86400,
    }),
  ),
  "sig",
].join(".");
localStorage.setItem("auth_token", token);
localStorage.setItem("user_role", DEMO_ROLE);
localStorage.setItem("user_name", "Ayu Lestari");
localStorage.setItem("user_email", "head@crg.demo");
localStorage.setItem("password_changed_at", new Date().toISOString());

const LoginPage = lazy(() =>
  import("../pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("../pages/auth/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("../pages/auth/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);

const OverviewDashboard = lazy(() =>
  import("../pages/monitor/OverviewDashboard").then((m) => ({
    default: m.OverviewDashboard,
  })),
);
const TaskTimeline = lazy(() =>
  import("../pages/monitor/TaskTimeline").then((m) => ({
    default: m.TaskTimeline,
  })),
);
const TestingStatus = lazy(() =>
  import("../pages/monitor/TestingStatus").then((m) => ({
    default: m.TestingStatus,
  })),
);

const PostImplementation = lazy(() =>
  import("../pages/monitor/PostImplementation").then((m) => ({
    default: m.PostImplementation,
  })),
);
const Analytics = lazy(() =>
  import("../pages/monitor/Analytics").then((m) => ({ default: m.Analytics })),
);
const AuditTrailPage = lazy(() =>
  import("../pages/audit/AuditTrailPage").then((m) => ({
    default: m.AuditTrailPage,
  })),
);

const ProfileSettingsPage = lazy(() =>
  import("../pages/profile/ProfileSettingsPage").then((m) => ({
    default: m.ProfileSettingsPage,
  })),
);
const UserManagementPage = lazy(() =>
  import("../pages/admin/UserManagementPage").then((m) => ({
    default: m.UserManagementPage,
  })),
);

/** Stand-in for ProtectedRoute/PublicRoute/AdminRoute in the demo build. */
const Open = () => <Outlet />;

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading demo…
  </div>
);

const Layout = () => (
  <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-[#00827D] via-[#009B95] to-[#E68A15] font-sans text-gray-900">
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-32 -top-32 h-[35rem] w-[35rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.10),transparent_70%)]" />
      <div className="absolute -right-32 top-1/2 h-[35rem] w-[35rem] rounded-full bg-[radial-gradient(circle,rgba(248,173,60,0.25),transparent_70%)]" />
      <div className="absolute -bottom-32 left-1/4 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(0,93,89,0.30),transparent_70%)]" />
    </div>
    <Header />
    <main className="relative z-[1] mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
      <Outlet />
    </main>
    <Footer />
    <PasswordWarningModal />
  </div>
);

export default function DemoApp() {
  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<OverviewDashboard />} />
            <Route path="/timeline" element={<TaskTimeline />} />
            <Route path="/sit" element={<TestingConsole phase={SDLC_PHASES.SIT} ns="sit" />} />
            <Route path="/testing" element={<TestingStatus />} />
            <Route
              path="/post-implementation"
              element={<PostImplementation />}
            />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit-trail" element={<AuditTrailPage />} />
            <Route path="/settings/profile" element={<ProfileSettingsPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Auth pages stay reachable (they explain the demo), but never gate it. */}
          <Route element={<Open />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
    </Router>
  );
}
