import { Suspense, lazy } from "react"; 
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react"; 

import { Header } from "./components/layouts/Header";
import { Footer } from "./components/layouts/Footer";
import { ProtectedRoute } from "./components/routes/ProtectedRoute";
import { PublicRoute } from "./components/routes/PublicRoute";
import { AdminRoute } from "./components/routes/AdminRoute";
import ConfirmReset from './pages/auth/ConfirmReset';
import { PasswordWarningModal } from "./components/modals/PasswordWarningModal";

// LAZY LOADING HALAMAN AUTH
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then(module => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage").then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage").then(module => ({ default: module.VerifyEmailPage })));

// LAZY LOADING HALAMAN MONITOR & SHARED
const OverviewDashboard = lazy(() => import("./pages/monitor/OverviewDashboard").then(module => ({ default: module.OverviewDashboard })));
const TaskTimeline = lazy(() => import("./pages/monitor/TaskTimeline").then(module => ({ default: module.TaskTimeline })));
const TestingStatus = lazy(() => import("./pages/monitor/TestingStatus").then(module => ({ default: module.TestingStatus })));
const PostImplementation = lazy(() => import("./pages/monitor/PostImplementation").then(module => ({ default: module.PostImplementation })));
const Analytics = lazy(() => import("./pages/monitor/Analytics").then(module => ({ default: module.Analytics })));

const ProfileSettingsPage = lazy(() => import("./pages/profile/ProfileSettingsPage").then(module => ({ default: module.ProfileSettingsPage })));

const UserManagementPage = lazy(() => import("./pages/admin/UserManagementPage").then(module => ({ default: module.UserManagementPage })));

const PageFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-[#36A39D]">
    <Loader2 className="h-8 w-8 animate-spin mb-4" />
    <p className="font-bold tracking-widest uppercase text-xs text-gray-400">Loading Module...</p>
  </div>
);

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-gray-900">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <PasswordWarningModal />
    </div>
  );
};

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" richColors expand={false} closeButton theme="light" />

      <Router>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/confirm-reset" element={<ConfirmReset />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<OverviewDashboard />} />
                <Route path="/timeline" element={<TaskTimeline />} />
                <Route path="/testing" element={<TestingStatus />} />
                <Route path="/post-implementation" element={<PostImplementation />} />
                <Route path="/analytics" element={<Analytics />} />
                
                <Route path="/settings/profile" element={<ProfileSettingsPage />} />
                
                <Route element={<AdminRoute />}>
                  <Route path="/users" element={<UserManagementPage />} />
                </Route>

              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}