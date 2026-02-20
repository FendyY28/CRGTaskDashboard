import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Users, FolderKanban, CheckCircle2, Clock, LayoutDashboard, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, Rocket } from "lucide-react"; 
import { Button } from "../ui/button"; 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "../ui/dialog";
import { AddProjectSheet } from "./project/AddProjectSheet";
import { EditProjectSheet } from "./project/EditProjectSheet"; 
import { API_URL } from "../../../lib/utils";
import { DashboardKpiCard, StatusBadge, DashboardCard } from "../dashboard/SharedComponents";
import { ActivityLog } from "../pages/ActivityLog"; 

// --- CONFIG & TYPES ---
const PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];
const PROGRESS_COLORS: Record<string, string> = { 
  completed: "#36A39D", 
  "in-progress": "#F9AD3C", 
  pending: "#E5E7EB" 
};

// --- HELPER ---
const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const backupEmail = localStorage.getItem('user_email');
    const backupName = localStorage.getItem('user_name');

    if (!token || token === "mock-jwt-token") return backupEmail || backupName || null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return backupEmail || backupName || null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    
    const parsed = JSON.parse(jsonPayload);
    return parsed.id || parsed.sub || parsed.userId || parsed.email || backupEmail; 
  } catch (e) {
    return localStorage.getItem('user_email') || null;
  }
};

const MemoizedActivityLog = memo(ActivityLog);
const MemoizedKpiCard = memo(DashboardKpiCard);

// --- SUB-COMPONENT: Memoized Project Row ---
const ProjectRow = memo(({ proj, onEdit, onDelete }: any) => (
  <div className="flex items-center justify-between p-4 bg-gray-50/30 rounded-xl border border-gray-100 group/item hover:border-[#36A39D]/30 hover:bg-[#36A39D]/5 transition-all">
    <div className="flex-1 min-w-0 pr-4 text-left">
      <p className="text-sm font-bold text-gray-800 truncate group-hover/item:text-[#36A39D] transition-colors">
        {proj.name}
      </p>
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1.5 mt-1">
        <Users className="h-3 w-3 text-[#F9AD3C]"/> {proj.pic || "Unassigned"}
      </p>
    </div>
    <div className="flex items-center gap-4 shrink-0">
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-black text-gray-700">{proj.overallProgress}%</span>
        <StatusBadge value={proj.status} />
      </div>
      <div className="flex items-center gap-1 border-l pl-3 ml-2 border-gray-200">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#36A39D] hover:bg-white" onClick={() => onEdit(proj)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-white" onClick={() => onDelete(proj.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  </div>
));
ProjectRow.displayName = "ProjectRow";

// 🚀 OPTIMISASI 1: Ekstraksi UI Fase ke komponen tersendiri untuk melokalisasi State.
// Buka/tutup Dropdown sekarang HANYA me-render ulang fase ini, BUKAN seluruh dashboard.
const PhaseBlock = memo(({ p, onEdit, onDelete }: { p: any, onEdit: any, onDelete: any }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm transition-all duration-300 overflow-hidden ring-1 ring-transparent hover:ring-[#36A39D]/20">
      <div 
        className={`flex justify-between items-center p-5 cursor-pointer select-none transition-colors ${isOpen ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-base font-bold transition-colors ${isOpen ? 'text-[#36A39D]' : 'text-gray-700'}`}>{p.phase}</span>
        <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-medium">{p.count} projects</span>
            {isOpen ? <ChevronUp className="h-4 w-4 text-[#36A39D]" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-1">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.progress}%`, backgroundColor: PROGRESS_COLORS[p.status] }} />
        </div>
        {isOpen && (
            <div className="mt-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {p.projects.length > 0 ? p.projects.map((proj: any) => (
                <ProjectRow 
                    key={proj.id} 
                    proj={proj} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                />
            )) : <p className="text-xs text-gray-400 text-center italic py-4">No projects are currently in this phase.</p>}
            </div>
        )}
      </div>
    </div>
  );
});
PhaseBlock.displayName = "PhaseBlock";

export function OverviewDashboard() {
  const [data, setData] = useState<{ list: any[], load: boolean, err: string }>({ list: [], load: true, err: "" });
  const [edit, setEdit] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const url = API_URL ? `${API_URL}/project` : 'http://localhost:3000/project';
      const token = localStorage.getItem('auth_token');
      
      const res = await fetch(url, { 
        signal,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!res.ok) throw new Error("Database connection failed");
      
      const list = await res.json();
      setData({ list, load: false, err: "" });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Fetch Error:", err);
        setData(p => ({ ...p, load: false, err: "Gagal terhubung ke server." }));
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort(); 
  }, [loadData]);

  const doDelete = async () => {
    if (!delId) return;
    setDeleting(true);

    const realUserId = getUserIdFromToken(); 
    const token = localStorage.getItem("auth_token");

    try {
      const url = API_URL ? `${API_URL}/project/${delId}` : `http://localhost:3000/project/${delId}`;

      const res = await fetch(url, { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ userId: realUserId })
      });
      
      if (res.ok) {
        await loadData();
        setDelId(null);
      } else {
        const errorData = await res.json();
        alert(`Gagal menghapus: ${errorData.message || res.statusText}`);
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setDeleting(false);
    }
  };

  // 🚀 OPTIMISASI 2: Loop Consolidation. 
  // Menggabungkan kalkulasi Stats dan Phase Breakdown ke dalam satu perulangan (O(N)).
  const { stats, phaseBreakdown } = useMemo(() => {
    const s = { total: 0, active: 0, completed: 0, new: 0, deliveredThisMonth: 0 };
    const map: Record<string, any[]> = {};
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    data.list.forEach(p => {
      // 1. Kalkulasi Stats
      s.total++; 
      
      const createdDate = new Date(p.createdAt);
      if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) s.new++;

      const progressVal = Number(p.overallProgress) || 0; // Pastikan format number
      const isComp = p.currentPhase === 'Live' && progressVal === 100;
      isComp ? s.completed++ : s.active++;

      const updatedDate = new Date(p.updatedAt);
      if (p.currentPhase === 'Live' && updatedDate.getMonth() === currentMonth && updatedDate.getFullYear() === currentYear) {
        s.deliveredThisMonth++;
      }

      // 2. Pemetaan Fase untuk Breakdown
      if (!map[p.currentPhase]) map[p.currentPhase] = [];
      map[p.currentPhase].push(p);
    });

    // 3. Transformasi Map ke Array untuk Render
    const phases = PHASES.map(ph => {
      const projects = map[ph] || [];
      const prog = projects.length 
        ? Math.round(projects.reduce((a, b) => a + (Number(b.overallProgress) || 0), 0) / projects.length) 
        : 0;
      
      return { 
        phase: ph, progress: prog, count: projects.length, 
        status: projects.length ? (prog === 100 ? "completed" : "in-progress") : "pending", 
        projects 
      };
    });

    return { stats: s, phaseBreakdown: phases };
  }, [data.list]);

  if (data.load) return <div className="h-screen flex items-center justify-center text-[#36A39D] font-bold animate-pulse text-lg">Initializing Dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Dashboard Overview</h2>
          <p className="text-gray-500 text-sm">Real-time project monitoring & statistics.</p>
        </div>
        <AddProjectSheet onProjectAdded={loadData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MemoizedKpiCard label="Total Projects" count={stats.total} icon={FolderKanban} trend={stats.new > 0 ? `+${stats.new} this month` : ""} color="#36A39D" clickable={false} />
        <MemoizedKpiCard label="Active Projects" count={stats.active} icon={Clock} description="Currently in progress" color="#F9AD3C" clickable={false} />
        <MemoizedKpiCard label="Completed" count={stats.completed} icon={CheckCircle2} color="#059669" clickable={false} />
        <MemoizedKpiCard label="Freshly Live" count={stats.deliveredThisMonth} icon={Rocket} description="Launched this month" color="#8B5CF6" clickable={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <DashboardCard 
                className="border-none shadow-sm ring-1 ring-gray-200" 
                icon={LayoutDashboard} color="#36A39D" 
                title={
                <div className="flex flex-col text-left">
                    <span className="text-[#36A39D] text-lg font-bold uppercase tracking-wide">SDLC Phase Breakdown</span>
                    <p className="text-[10px] text-gray-400 font-medium normal-case tracking-normal">Expand a phase to manage projects.</p>
                </div>
                }
                contentClassName="space-y-4 pt-0"
            >
                {/* 🚀 Render PhaseBlock yang sudah terisolasi */}
                {phaseBreakdown.map(p => (
                  <PhaseBlock 
                    key={p.phase} 
                    p={p} 
                    onEdit={setEdit} 
                    onDelete={setDelId} 
                  />
                ))}
            </DashboardCard>
        </div>

        <div className="lg:col-span-1">
            <div className="sticky top-6">
                <MemoizedActivityLog />
            </div>
        </div>
      </div>

      <EditProjectSheet open={!!edit} onOpenChange={(v: boolean) => !v && setEdit(null)} project={edit} onProjectUpdated={loadData} />

      <Dialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <DialogContent className="bg-white sm:max-w-[400px] p-6 text-center border-none shadow-2xl rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-red-50 rounded-full text-red-600 ring-4 ring-red-50/50">
              <Trash2 className="h-8 w-8" />
            </div>
            <div className="space-y-2 text-center">
              <DialogTitle className="text-xl font-bold text-gray-900">Delete Project?</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Permanently delete <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{delId}</span>? Action cannot be undone.
              </DialogDescription>
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3 w-full">
            <Button variant="outline" onClick={() => setDelId(null)} disabled={deleting} className="flex-1 rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 transition-colors">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}