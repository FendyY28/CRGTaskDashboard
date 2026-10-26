import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeeklyProgress } from "../app/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WeeklyTotals {
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

interface TokenPayload {
  role?: string;
}

/**
 * Decode the payload segment of a JWT.
 *
 * Returns `null` for a missing/mock token, a malformed token, or invalid JSON,
 * so callers can apply their own fallback instead of duplicating the decode.
 */
const decodeTokenPayload = (token: string | null): TokenPayload | null => {
  if (!token || token === "mock-jwt-token") return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    // Base64url -> Base64, then percent-decode to handle UTF-8 payloads.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));

    return JSON.parse(jsonPayload) as TokenPayload;
  } catch {
    return null;
  }
};

// Mengambil Role dari JWT Token
export const getUserRoleFromToken = () => {
  const backupRole = localStorage.getItem('user_role'); // Disimpan saat login
  const payload = decodeTokenPayload(localStorage.getItem('auth_token'));

  // Kembalikan role dari token, atau fallback ke localStorage
  return payload?.role || backupRole || null;
};