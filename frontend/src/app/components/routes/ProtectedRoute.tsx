import { Navigate, Outlet } from "react-router-dom";
import { hasValidAuthToken } from "../../utils/auth";

export const ProtectedRoute = () => {
  // 1. Ambil token dari LocalStorage dan cek masa berlakunya
  // 2. Jika token tidak ada / sudah kadaluarsa -> alihkan ke halaman Login.
  // "replace" digunakan agar user tidak bisa kembali (Back) ke halaman ini
  if (!hasValidAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  // 3. Jika token valid, izinkan akses ke halaman anak (Outlet)
  return <Outlet />;
};