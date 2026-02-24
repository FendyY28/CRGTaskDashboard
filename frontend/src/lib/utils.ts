// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_URL = "http://localhost:3000";

// Format Tanggal (DD MMM YYYY)
export const fmtDate = (d?: string | null) => 
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

// Kapitalisasi (misal: "on-track" -> "On Track")
export const capitalize = (s: string) => 
  s ? s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

// Mengambil User ID dari JWT Token
export const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const backupEmail = localStorage.getItem('user_email');
    const backupName = localStorage.getItem('user_name');

    // Return default value jika token tidak ada / mock
    if (!token || token === "mock-jwt-token") return backupEmail || backupName || "system";
    
    const parts = token.split('.');
    if (parts.length !== 3) return backupEmail || "system";

    // Decode Base64 Payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    
    const parsed = JSON.parse(jsonPayload);
    
    // Fleksibel mengambil field ID (id, sub, userId, atau email)
    return parsed.id || parsed.sub || parsed.userId || parsed.email || backupEmail || "system"; 
  } catch (e) {
    return localStorage.getItem('user_email') || "system";
  }
};