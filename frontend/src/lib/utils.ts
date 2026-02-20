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