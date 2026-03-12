import { useMemo } from "react";

export function useRBAC() {
  const role = localStorage.getItem("user_role")?.toUpperCase();

  const isAdmin = role === "ADMIN";
  const isHead = role === "HEAD";
  const isOfficer = role === "OFFICER";

  const canEdit = useMemo(() => {
    if (!role) return false;
    
    return isAdmin || isOfficer; 
  }, [role, isAdmin, isOfficer]);

  return { 
    role, 
    isAdmin, 
    isHead, 
    isOfficer, 
    canEdit 
  };
}