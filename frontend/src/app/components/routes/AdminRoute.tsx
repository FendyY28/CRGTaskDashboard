import { Navigate, Outlet } from "react-router-dom";
import { getUserRoleFromToken } from "../../../lib/utils";

export function AdminRoute() {
  const role = getUserRoleFromToken();

  // Jika tidak ada role (belum login), langsung arahkan ke login
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Jika bukan ADMIN, kembali ke dashboard
  if (role !== "ADMIN") {
    console.warn("Akses ditolak: Hanya ADMIN yang diizinkan mengakses halaman ini.");
    return <Navigate to="/dashboard" replace />;
  }

  // Jika ADMIN, masuk
  return <Outlet />;
}