import { Navigate, Outlet } from "react-router-dom";

export const PublicRoute = () => {
  // 1. Ambil token dari LocalStorage
  const token = localStorage.getItem("auth_token");

  // 2. Cek: Jika SUDAH ADA token (artinya sudah login)
  if (token) {
    // Jangan kasih masuk Login lagi, langsung lempar ke Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Jika BELUM login, silakan akses halaman (Login/Register/Forgot Pass)
  return <Outlet />;
};