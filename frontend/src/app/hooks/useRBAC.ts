import { useMemo } from "react";

export function useRBAC() {
  // 🚀 PERBAIKAN: Ambil langsung key 'user_role' dari localStorage
  const role = localStorage.getItem("user_role");

  const canEdit = useMemo(() => {
    // Jika role kosong, jangan kasih akses edit
    if (!role) return false;

    // Sesuai screenshot Anda, role disimpan dengan huruf besar "OFFICER"
    return role === "OFFICER";
  }, [role]);

  const isHead = role === "HEAD";
  const isOfficer = role === "OFFICER";

  return { canEdit, isHead, isOfficer, role };
}