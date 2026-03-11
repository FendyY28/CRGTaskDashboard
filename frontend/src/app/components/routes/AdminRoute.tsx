import { Navigate, Outlet } from "react-router-dom";
import { getUserRoleFromToken } from "../../../lib/utils";

export function AdminRoute() {
  const role = getUserRoleFromToken();

  // Jika bukan ADMIN, tendang kembali ke dashboard
  if (role !== "ADMIN") {
    console.warn("Akses ditolak: Hanya ADMIN yang diizinkan mengakses halaman ini.");
    return <Navigate to="/dashboard" replace />;
  }

  // Jika ADMIN, persilakan masuk
  return <Outlet />;
}