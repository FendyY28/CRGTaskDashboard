import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
  // 1. Ambil token dari LocalStorage
  const token = localStorage.getItem("auth_token");

  // 2. Cek: Jika TIDAK ADA token
  if (!token) {
    // Alihkan ke halaman Login. 
    // "replace" digunakan agar user tidak bisa kembali (Back) ke halaman ini
    return <Navigate to="/login" replace />;
  }

  // 3. Jika ADA token, izinkan akses ke halaman anak (Outlet)
  return <Outlet />;
};