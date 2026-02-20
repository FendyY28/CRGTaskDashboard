import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";

// --- IMPORTS COMPONENTS ---
import { LoginPage } from "./components/pages/auth/LoginPage"; 
import { RegisterPage } from "./components/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./components/pages/recovery/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/pages/recovery/ResetPasswordPage";
import { VerifyEmailPage } from "./components/pages/auth/VerifyEmailPage";

// --- IMPORTS DASHBOARD PAGES ---
import { OverviewDashboard } from "./components/pages/OverviewDashboard";
import { TaskTimeline } from "./components/pages/TaskTimeline";
import { TestingStatus } from "./components/pages/TestingStatus";
import { PostImplementation } from "./components/pages/PostImplementation";

// --- IMPORTS LAYOUTS ---
import { Header } from "./components/layouts/header";
import { Footer } from "./components/layouts/footer";

// --- IMPORTS SECURITY ROUTES (SATPAM) ---
// Pastikan Anda sudah membuat file ini di folder components/routes
import { ProtectedRoute } from "./components/routes/ProtectedRoute";
import { PublicRoute } from "./components/routes/PublicRoute";


// --- LAYOUT COMPONENT ---
const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-gray-900">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        
        {/* =========================================
            1. PUBLIC ROUTES (GUEST ONLY)
            User yang SUDAH login akan ditendang ke Dashboard
           ========================================= */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>


        {/* =========================================
            2. PROTECTED ROUTES (USER ONLY)
            Guest akan ditendang ke Login
           ========================================= */}
        <Route element={<ProtectedRoute />}>
          {/* Di dalam ProtectedRoute, kita pasang Layout Dashboard */}
          <Route element={<DashboardLayout />}>
            
            {/* Redirect root "/" ke dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Halaman-halaman Dashboard */}
            <Route path="/dashboard" element={<OverviewDashboard />} />
            <Route path="/timeline" element={<TaskTimeline />} />
            <Route path="/testing" element={<TestingStatus />} />
            <Route path="/post-implementation" element={<PostImplementation />} />
          
          </Route>
        </Route>


        {/* =========================================
            3. CATCH ALL (404)
            Redirect ke dashboard (nanti ProtectedRoute yang akan urus)
           ========================================= */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        
      </Routes>
    </Router>
  );
}