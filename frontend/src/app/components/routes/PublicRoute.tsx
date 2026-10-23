import { Navigate, Outlet } from "react-router-dom";
import { hasValidAuthToken } from "../../utils/auth";

export const PublicRoute = () => {
  // Hanya jika token benar-benar valid, arahkan ke Dashboard.
  // Jika tidak ada token atau token sudah kadaluarsa, izinkan akses ke halaman publik (Login, dsb).
  if (hasValidAuthToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
