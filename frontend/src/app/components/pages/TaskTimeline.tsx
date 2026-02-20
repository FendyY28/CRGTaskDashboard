import { useState, useEffect, useRef, useMemo, useCallback, memo, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { User, Clock, ChevronDown, ChevronUp, CheckCircle2, LayoutDashboard, AlertCircle, Timer, Filter, PlusCircle, ArrowRight, Loader2, Map, ArrowLeft, FolderKanban, X, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { ProjectGantt } from "./ProjectGantt";
import type { Project, WeeklyProgress } from "../../types";
import { API_URL, fmtDate } from "../../../lib/utils";
import { DashboardKpiCard, DashboardInput, DashboardTextarea, DashboardSelect, StatusBadge, DashboardCard } from "../dashboard/SharedComponents";

const PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];
const PROGRESS_COLORS = { track: "#36A39D", risk: "#F9AD3C", overdue: "#E11D48" };

const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const backupEmail = localStorage.getItem('user_email');
    const backupName = localStorage.getItem('user_name');
    if (!token || token === "mock-jwt-token") return backupEmail || backupName || "system";
    const parts = token.split('.');
    if (parts.length !== 3) return backupEmail || "system";
    const jsonPayload = decodeURIComponent(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    const parsed = JSON.parse(jsonPayload);
    return parsed.id || parsed.sub || parsed.userId || parsed.email || backupEmail || "system"; 
  } catch (e) { return localStorage.getItem('user_email') || "system"; }
};

// --- SUB-COMPONENT: Weekly Row ---
const WeeklyRow = memo(({ week, projectStatus, onTaskToggle, onRequestDeleteLog, onRequestDeleteTask }: { 
    week: WeeklyProgress, 
    projectStatus: string, 
    onTaskToggle: () => void, 
    onRequestDeleteLog: (id: number) => void,
    onRequestDeleteTask: (id: number) => void 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const color = projectStatus.includes('track') || projectStatus === 'completed' ? PROGRESS_COLORS.track : PROGRESS_COLORS.risk;

  const handleCheck = async (tid: number, e: React.MouseEvent) => {
    e.stopPropagation(); setLoadingId(tid);
    try { 
      const userId = getUserIdFromToken();
      const res = await fetch(`${API_URL}/project/task/${tid}/toggle`, { 
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) 
      }); 
      if (res.ok) onTaskToggle(); 
    } catch { alert("Update failed"); } 
    finally { setLoadingId(null); }
  };

  return (
    <>
      <TableRow className="hover:bg-gray-50/50 cursor-pointer group transition-colors relative" onClick={() => setExpanded(!expanded)}>
        <TableCell><div className="flex items-center gap-3 font-semibold text-gray-700 group-hover:text-[#36A39D]">{expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>} {week.weekRange}</div></TableCell>
        <TableCell className="text-center font-medium text-gray-600">{week.tasks?.filter((t: any) => t.status === 'completed').length} / {week.tasks?.length || 0}</TableCell>
        <TableCell className="min-w-[120px]"><div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${week.progress}%`, backgroundColor: color }} /></div></TableCell>
        <TableCell className="text-center font-bold text-[#36A39D] relative">
            <div className="flex items-center justify-center gap-3">
                <span>{week.progress}%</span>
                <Button 
                    variant="ghost" size="icon" 
                    onClick={(e) => { e.stopPropagation(); onRequestDeleteLog(week.id); }} 
                    className="h-6 w-6 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all absolute right-2"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow className="bg-gray-50/30 animate-in slide-in-from-top-1">
          <TableCell colSpan={4} className="p-4">
            <div className="grid gap-2">
              {week.tasks?.length > 0 ? week.tasks?.map((t: any) => {
                const isDone = t.status === 'completed';
                return (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm transition-all bg-white group/task ${isDone ? 'border-[#36A39D]/30' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div onClick={(e) => handleCheck(t.id, e)} className={`h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isDone ? 'bg-[#36A39D] border-[#36A39D]' : 'bg-white hover:border-[#36A39D]'}`}>
                        {loadingId === t.id ? <Loader2 className="h-3 w-3 animate-spin text-white"/> : isDone && <CheckCircle2 className="h-3.5 w-3.5 text-white"/>}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isDone ? 'text-[#36A39D] line-through opacity-60' : 'text-gray-800'}`}>{t.taskName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{t.taskId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold ${isDone ? 'text-[#36A39D] border-[#36A39D]/20' : 'text-gray-500'}`}>{isDone ? 'DONE' : 'WIP'}</Badge>
                        <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); onRequestDeleteTask(t.id); }}
                            className="h-6 w-6 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/task:opacity-100 transition-all"
                        >
                             <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                  </div>
                );
              }) : <div className="text-center text-xs text-gray-400 py-2 italic">No tasks assigned.</div>}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
WeeklyRow.displayName = "WeeklyRow";

// --- SUB-COMPONENT: Project Card ---
const ProjectCard = memo(({ project, onRefresh, onViewGantt, highlight, onDeleteLog, onDeleteTask }: any) => {
  const { globalPct, completedPhases } = useMemo(() => {
    if (project.status === 'completed') return { globalPct: 100, completedPhases: 6 };
    const idx = PHASES.indexOf(project.currentPhase);
    const progressInCurrentPhase = Number(project.overallProgress) || 0;
    return { globalPct: Math.round(((idx * 100) + progressInCurrentPhase) / 600 * 100), completedPhases: progressInCurrentPhase === 100 ? idx + 1 : idx };
  }, [project.currentPhase, project.overallProgress, project.status]);

  // 🚀 OPTIMISASI 3: Membuat dictionary O(1) agar tidak perlu memanggil .find() berulang kali
  const phaseDict = useMemo(() => {
    const dict: Record<string, any> = {};
    if (project.sdlcPhases) {
      project.sdlcPhases.forEach((p: any) => dict[p.phaseName] = p);
    }
    return dict;
  }, [project.sdlcPhases]);

  const accentColor = project.status.includes('track') || project.status === 'completed' ? PROGRESS_COLORS.track : PROGRESS_COLORS.risk;

  return (
    <Card className={`border-none shadow-md ring-1 bg-white overflow-hidden scroll-mt-24 rounded-2xl group transition-all duration-300 ${highlight ? 'ring-2 ring-[#36A39D] shadow-lg scale-[1.01]' : 'ring-gray-100'}`}>
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
      <CardHeader className="pb-6 pt-6 px-7 text-left">
        <div className="flex justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#36A39D] bg-[#36A39D]/5 px-2.5 py-1 rounded-md border border-[#36A39D]/20">{project.id}</span>
              <StatusBadge value={project.status} />
              {project.cycle > 1 && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">Cycle {project.cycle}</Badge>}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">{project.name}</CardTitle>
                <div className="flex gap-4 text-xs text-gray-500 pt-3 font-medium">
                  <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><User className="h-3.5 w-3.5 text-[#F9AD3C]" /> {project.pic || "Unassigned"}</span>
                  <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><LayoutDashboard className="h-3.5 w-3.5 text-[#36A39D]" /> {project.currentPhase}</span>
                </div>
              </div>
              <Button onClick={() => onViewGantt(project)} variant="outline" className="h-9 text-xs gap-2 text-[#36A39D] border-[#36A39D]/30 bg-[#36A39D]/5 hover:bg-[#36A39D] hover:text-white rounded-xl shadow-none"><Map className="h-3.5 w-3.5" /> View Gantt</Button>
            </div>
          </div>
          <div className="text-right min-w-[120px] pl-6 border-l border-gray-100 hidden md:block">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Overall Progress</p>
            <p className="text-4xl font-black text-[#36A39D]">{globalPct}<span className="text-2xl text-gray-300 ml-1">%</span></p>
            <p className="text-[10px] text-gray-400 mt-1 font-medium">{completedPhases} of 6 phases done</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-2 px-7 pb-8 text-left">
        <div className="space-y-4">
          <h4 className="text-xs font-bold flex items-center gap-2 text-gray-500 uppercase tracking-widest"><Map className="h-4 w-4 text-[#36A39D]" /> SDLC Roadmap</h4>
          <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm bg-white overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  {["Phase Step", "Timeline", "Status"].map((h, i) => <TableHead key={i} className={`text-[10px] font-bold uppercase text-gray-500 h-10 ${i===2?'text-center':''}`}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PHASES.map((ph, idx) => {
                  const pData = phaseDict[ph]; // Pengambilan instan O(1)
                  const curIdx = PHASES.indexOf(project.currentPhase);
                  const stat = idx < curIdx ? 'completed' : (idx === curIdx ? (Number(project.overallProgress) === 100 ? 'completed' : project.status) : 'pending');
                  return (
                    <TableRow key={ph} className={stat === 'pending' ? "bg-gray-50/30 opacity-60" : "hover:bg-[#36A39D]/5"}>
                      <TableCell className="py-3 font-semibold text-gray-800 text-xs">{idx + 1}. {ph}</TableCell>
                      <TableCell className="text-[11px] text-gray-600 font-medium py-3">{pData ? `${fmtDate(pData.startDate)} - ${fmtDate(pData.deadline)}` : "-"}</TableCell>
                      <TableCell className="text-center py-3"><StatusBadge value={stat} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold flex items-center gap-2 text-gray-500 uppercase tracking-widest"><Clock className="h-4 w-4 text-[#36A39D]" /> Weekly Logs</h4>
          <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>{["Period", "Tasks", "Progress", "%"].map((h, i) => <TableHead key={i} className={`text-[10px] font-bold uppercase text-gray-500 h-10 ${i!==1?'text-center':''}`}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {project.weeklyProgress?.length ? project.weeklyProgress.map((w: any, idx: number) => 
                    <WeeklyRow key={idx} week={w} projectStatus={project.status} onTaskToggle={onRefresh} onRequestDeleteLog={onDeleteLog} onRequestDeleteTask={onDeleteTask} />
                ) : <TableRow><TableCell colSpan={4} className="text-center text-xs text-gray-400 py-8 italic">No updates logged yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
ProjectCard.displayName = "ProjectCard";

// 🚀 OPTIMISASI 1: Ekstraksi komponen Form.
// Hal ini mencegah TaskTimeline (dan semua ProjectCard) me-render ulang setiap kali kamu mengetik karakter di Form.
const LogActivityForm = memo(({ projects, onSuccess }: { projects: Project[], onSuccess: () => void }) => {
  const [logForm, setLogForm] = useState({ pid: "", week: "", tasks: "" });
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!logForm.pid || !logForm.week) return;
    setIsLogging(true);
    try {
      const userId = getUserIdFromToken();
      const res = await fetch(`${API_URL}/project/log`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: logForm.pid, weekRange: logForm.week, tasks: logForm.tasks.split('\n').filter(t => t), progress: 0, userId })
      });
      if (res.ok) { setLogForm({ pid: "", week: "", tasks: "" }); onSuccess(); }
    } catch { alert("Log failed"); } 
    finally { setIsLogging(false); }
  };

  return (
    <form onSubmit={handleLog} className="space-y-4">
      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-gray-500 uppercase">Project</Label><DashboardSelect value={logForm.pid} onChange={(e: any) => setLogForm({...logForm, pid: e.target.value})}><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</DashboardSelect></div>
      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-gray-500 uppercase">Period (Week)</Label><DashboardInput placeholder="e.g. Sprint 1" value={logForm.week} onChange={(e: any) => setLogForm({...logForm, week: e.target.value})} /></div>
      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-gray-500 uppercase">Assign Tasks</Label><DashboardTextarea value={logForm.tasks} onChange={(e: any) => setLogForm({...logForm, tasks: e.target.value})} placeholder="Enter tasks (one per line)..." className="min-h-[120px]" /></div>
      <Button type="submit" disabled={isLogging || !logForm.pid || !logForm.week || !logForm.tasks} className="w-full font-bold text-white shadow-md h-10 rounded-xl bg-[#36A39D] hover:bg-[#2b8580]">{isLogging ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save & Assign Tasks"}</Button>
    </form>
  );
});
LogActivityForm.displayName = "LogActivityForm";


// --- MAIN COMPONENT ---
export function TaskTimeline() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  
  const [deleteConf, setDeleteConf] = useState<{ type: 'log' | 'task', id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_URL}/project`, { signal });
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error("Load failed", e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const scrollTo = useCallback((id: string) => {
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 2000);
  }, []);

  // 🚀 OPTIMISASI 2: Callbacks ini di-"kunci" posisinya di memori dengan useCallback.
  // Sekarang React.memo pada ProjectCard bisa bekerja 100% sempurna.
  const handleViewGantt = useCallback((p: Project) => {
    setSelProject(p);
    setView('detail');
  }, []);

  const handleDeleteLog = useCallback((id: number) => {
    setDeleteConf({ type: 'log', id });
  }, []);

  const handleDeleteTask = useCallback((id: number) => {
    setDeleteConf({ type: 'task', id });
  }, []);

  const executeDelete = async () => {
    if (!deleteConf) return;
    setIsDeleting(true);
    try {
        const userId = getUserIdFromToken();
        const url = deleteConf.type === 'log' 
            ? `${API_URL}/project/log/${deleteConf.id}`
            : `${API_URL}/project/task/${deleteConf.id}`;
        
        const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (res.ok) {
            setDeleteConf(null); 
            await fetchData();   
        } else {
            alert(`Failed to delete ${deleteConf.type}`);
        }
    } catch (e) {
        alert("System error.");
    } finally {
        setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => (!filter || filter === 'all') ? projects : projects.filter(p => p.status === filter), [projects, filter]);

  if (loading) return <div className="h-screen flex items-center justify-center text-[#36A39D] font-bold animate-pulse text-lg">Loading Timelines...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-1 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{view === 'list' ? "Project Timeline & Tracking" : `Gantt View: ${selProject?.name}`}</h2>
          {view === 'detail' && <Button variant="outline" onClick={() => { setView('list'); setSelProject(null); }} className="gap-2 h-9 rounded-xl"><ArrowLeft className="h-4 w-4"/> Back to Timeline</Button>}
        </div>
        <p className="text-sm text-gray-500">Real-time monitoring of project SDLC phases and weekly deliverables.</p>
      </div>

      {view === 'list' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {l:"On Track", s:'on-track', i:CheckCircle2, c:PROGRESS_COLORS.track}, 
              {l:"At Risk", s:'at-risk', i:AlertCircle, c:PROGRESS_COLORS.risk}, 
              {l:"Overdue", s:'overdue', i:Timer, c:PROGRESS_COLORS.overdue}, 
              {l:"Active Projects", s:'all', i:LayoutDashboard, c:"#0F766E"}
            ].map((k,i) => (
              <DashboardKpiCard key={i} label={k.l} count={projects.filter(p => k.s === 'all' ? true : p.status === k.s).length} icon={k.i} color={k.c} active={filter === k.s} onClick={() => setFilter(filter === k.s ? null : k.s)} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-8">
              {filter && filter !== 'all' && (
                <div className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-left-2">
                  <Filter className="h-4 w-4"/> Filtering: <span className="uppercase tracking-wide">{filter.replace('-', ' ')}</span>
                  <button onClick={() => setFilter(null)} className="ml-auto p-1 rounded-full hover:bg-black/5"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              
              <div className="space-y-8">
                {filtered.length > 0 ? filtered.map(p => (
                  <div key={p.id} ref={el => refs.current[p.id] = el} className="scroll-mt-24 transition-all duration-500">
                    <ProjectCard 
                      project={p} 
                      onRefresh={fetchData} 
                      onViewGantt={handleViewGantt} 
                      highlight={highlightId === p.id} 
                      onDeleteLog={handleDeleteLog} 
                      onDeleteTask={handleDeleteTask}
                    />
                  </div>
                )) : (
                  <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center">
                    <FolderKanban className="h-12 w-12 text-gray-200 mb-2"/>
                    <p className="font-medium">No projects found for the selected filter.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-6 space-y-6">
                <DashboardCard color="#36A39D" title="Quick Navigation" icon={Filter} className="max-h-[350px] overflow-hidden" contentClassName="space-y-2 overflow-y-auto pr-2 px-3 pb-5 h-[250px] custom-scrollbar">
                  {filtered.map(p => (
                    <button key={p.id} onClick={() => scrollTo(p.id)} className="w-full text-left p-2.5 hover:bg-[#36A39D]/5 rounded-lg flex items-center justify-between group cursor-pointer border border-transparent hover:border-[#36A39D]/20 transition-all">
                      <div className="truncate pr-2"><span className="text-xs font-bold text-gray-700 block truncate group-hover:text-[#36A39D]">{p.name}</span><span className="text-[10px] text-gray-400">{p.id}</span></div>
                      <ArrowRight className="h-3 w-3 text-gray-300 group-hover:text-[#36A39D] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </DashboardCard>

                <DashboardCard color="#00A651" title="Log Team Activity" icon={PlusCircle} contentClassName="pt-5 px-5 pb-6 text-left">
                  {/* Komponen form dipisah di sini agar tidak membebani parent */}
                  <LogActivityForm projects={projects} onSuccess={fetchData} />
                </DashboardCard>
              </div>
            </div>
          </div>
        </>
      ) : selProject && <ProjectGantt project={selProject} onBack={() => { setView('list'); setSelProject(null); }} />}

      <Dialog open={!!deleteConf} onOpenChange={(open) => !open && setDeleteConf(null)}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[400px] text-center p-8">
            <DialogHeader>
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-red-50 rounded-full text-red-600 ring-4 ring-red-50/50">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            Delete {deleteConf?.type === 'log' ? 'Weekly Log' : 'Task'}?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            {deleteConf?.type === 'log' 
                                ? "This will permanently remove the log and all tasks inside it. This action cannot be undone."
                                : "This task will be removed permanently. Progress will be recalculated."}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <DialogFooter className="mt-6 flex gap-2 w-full">
                <Button variant="outline" onClick={() => setDeleteConf(null)} className="flex-1 rounded-xl h-11 font-bold">Cancel</Button>
                <Button onClick={executeDelete} disabled={isDeleting} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white h-11 font-bold">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}