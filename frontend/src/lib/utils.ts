import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeeklyProgress } from "../app/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface WeeklyTotals {
  taskCount: number;
  doneCount: number;
  overall: number;
}

/**
 * Hitung total task & persentase selesai dari daftar weekly progress.
 * Null-guard array tasks dan clamp hasil ke 0-100 supaya data backend yang
 * tidak konsisten tidak pernah menampilkan angka aneh di UI.
 */
export const computeWeeklyTotals = (weeks: WeeklyProgress[]): WeeklyTotals => {
  let taskCount = 0;
  let doneCount = 0;
  for (const w of weeks) {
    const tasks = w.tasks ?? [];
    taskCount += tasks.length;
    doneCount += tasks.filter((task) => task.status === "completed").length;
  }
  const raw = taskCount ? (doneCount / taskCount) * 100 : 0;
  return { taskCount, doneCount, overall: Math.min(100, Math.max(0, Math.round(raw))) };
};

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Format Tanggal (DD MMM YYYY)
export const fmtDate = (d?: string | null) => 
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

/** Ubah "YYYY-MM-DD" -> "DD/MM/YYYY". */
export const toSlashDate = (d: string) => {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

/** Format objek Date menjadi "DD/MM/YYYY" tanpa pergeseran zona waktu. */
const toLocalSlashDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/**
 * Rentang minggu (Senin-Minggu) dari tanggal acuan, diformat "DD/MM/YYYY".
 * Anchor = hari dalam minggu tersebut (bukan hari Senin), jadi label selalu
 * dimulai dari tanggal yang sama dengan yang dipilih user.
 */
export const weekRangeFrom = (anchor: string): string => {
  const d = new Date(`${anchor}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  // getDay(): 0=Minggu ... 6=Sabtu. Mundur ke Senin minggu yang sama.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const monday = new Date(d);
  const sunday = new Date(d);
  sunday.setDate(sunday.getDate() + 6);
  return `${toLocalSlashDate(monday)} - ${toLocalSlashDate(sunday)}`;
};

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

// 🔥 BARU: Mengambil Role dari JWT Token
export const getUserRoleFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const backupRole = localStorage.getItem('user_role'); // Jika Anda menyimpan role di localStorage saat login

    if (!token || token === "mock-jwt-token") return backupRole || null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return backupRole || null;

    // Decode Base64 Payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    
    const parsed = JSON.parse(jsonPayload);
    
    // Kembalikan role dari token, atau fallback ke localStorage
    return parsed.role || backupRole || null; 
  } catch (e) {
    return localStorage.getItem('user_role') || null;
  }
};