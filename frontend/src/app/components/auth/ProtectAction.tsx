import { type ReactNode } from "react";
import { useRBAC } from "../../hooks/useRBAC";

interface ProtectActionProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireRole?: "HEAD" | "OFFICER" | "ADMIN"; //  Tambahkan prop baru
}

export function ProtectAction({ children, fallback = null, requireRole }: ProtectActionProps) {
  const { role, canEdit } = useRBAC();

  if (requireRole) {
    if (role !== requireRole) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  // 2. Default behavior (untuk tombol Edit/Delete yang butuh canEdit)
  if (!canEdit) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}