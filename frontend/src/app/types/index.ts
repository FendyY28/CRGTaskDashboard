// src/app/types/index.ts

// --- 1. CORE TYPES ---
export type ProjectStatus = 
  | "on-track" 
  | "at-risk" 
  | "overdue" 
  | "completed" 
  | "in-progress" 
  | "not-started" 
  | "pending";

export type TestCaseType = "positive" | "negative";
export type UatStatus = "pass" | "fail";

// --- 2. TIMELINE & PROGRESS COMPONENTS ---
export interface Task {
  id: number;       // 👈 WAJIB: ID Database (untuk update status)
  taskId: string;   // ID String (misal: TSK-001)
  taskName: string;
  status: string;   // 'completed', 'in-progress', etc.
  completedDate?: string;
}

export interface WeeklyProgress {
  id: number;       // 👈 WAJIB: Hapus tanda tanya (?) agar tidak error saat delete
  weekRange: string;
  progress: number;
  completed: number;
  total: number;
  tasks: Task[];
}

export interface SDLCPhase {
  id: number;       // 👈 Disarankan wajib ada juga
  phaseName: string;
  startDate: string;
  deadline: string;
  status: string;   // 'completed', 'in-progress', 'pending'
}

// --- 3. TESTING & QA COMPONENTS ---
export interface Defect {
  id?: number;      // Tambahkan id database jika perlu
  defectId: string; // ID String (DEF-001)
  description: string;
  severity: string; // 'Low', 'Medium', 'High'
  status: string;   // 'open', 'resolved'
  parentTestCase?: string; 
  parentProject?: string;
}

export interface TestCase {
  id: string; // UUID
  title?: string; // Sesuaikan dengan backend (kadang title, kadang testCase)
  testCase?: string; // Fallback jika pakai nama field lama
  type?: TestCaseType;
  testCaseType?: TestCaseType; 
  status?: string; 
  uatStatus?: UatStatus;
  tester?: string;
  notes?: string;
  defects?: Defect[];
  
  // Field tambahan untuk Soft Delete & Audit
  updatedBy?: string;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  
  projectName?: string; 
}

// --- 4. PIR (POST IMPLEMENTATION REVIEW) COMPONENTS ---
export interface ProjectIssue {
  id?: number;
  issueId: string;
  title?: string; // Tambahkan title sesuai schema prisma
  priority: string; // 'critical', 'high', 'medium', 'low'
  description: string;
  impactArea: string;
  reportedBy: string;
  reportedDate: string;
  status: string; // 'open', 'in-progress', 'resolved'
  projectName?: string;
}

export interface ImprovementNote {
  id?: number;
  noteId: string;
  reviewer: string;
  developer: string;
  feedback: string;
  recommendations: string;
  priority: string;
  createdDate: string;
  projectName?: string;
}

// --- 5. MASTER PROJECT INTERFACE ---
export interface Project {
  // Core Info
  id: string;
  name: string;
  pic: string;
  currentPhase: string;
  status: ProjectStatus;
  overallProgress: number;
  
  // Dates
  createdAt: string; 
  updatedAt: string;
  projectStartDate: string;
  projectDeadline: string;

  // Relations (Arrays)
  sdlcPhases?: SDLCPhase[];
  weeklyProgress?: WeeklyProgress[];
  testCases?: TestCase[];
  issues?: ProjectIssue[];
  improvements?: ImprovementNote[];
  cycle?: number;
}