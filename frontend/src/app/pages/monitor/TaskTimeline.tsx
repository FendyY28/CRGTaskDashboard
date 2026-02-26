import { useState, useEffect, useRef, useMemo, useCallback, memo, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { 
  User, Clock, ChevronDown, ChevronUp, CheckCircle2, 
  LayoutDashboard, AlertCircle, Timer, Filter, PlusCircle, 
  ArrowRight, Loader2, Map, ArrowLeft, FolderKanban, X, Trash2, AlertTriangle 
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { ProjectGantt } from "../../components/features/monitor/ProjectGantt";
import type { Project, WeeklyProgress } from "../../types";
import { fmtDate } from "../../../lib/utils";
import { DashboardKpiCard, DashboardInput, DashboardTextarea, DashboardSelect, StatusBadge, DashboardCard } from "../../components/dashboard/index";

// 🔥 IMPORTS CONSTANTS DAN API WRAPPER
import { SDLC_PHASES, PROJECT_STATUS, THEME } from "../../constants/projectConstants"; 
import { api } from "../../services/api"; 

const PHASES_ARRAY = Object.values(SDLC_PHASES);
// 🔥 Overdue diubah menjadi merah (#E11D48), sisanya tetap menggunakan THEME
const PROGRESS_COLORS = { track: THEME.TOSCA, risk: THEME.BSI_YELLOW, overdue: "#E11D48" }; 

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
  const color = projectStatus.includes('track') || projectStatus === PROJECT_STATUS.COMPLETED ? PROGRESS_COLORS.track : PROGRESS_COLORS.risk;

  const handleCheck = async (tid: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setLoadingId(tid);
    try { 
      await api.patch(`/project/task/${tid}/toggle`); 
      onTaskToggle(); 
    } catch (err: any) { 
      alert(err.message || "Update failed"); 
    } finally { 
      setLoadingId(null); 
    }
  };

  return (
    <>
      <TableRow className="hover:bg-gray-50/50 cursor-pointer group transition-colors relative" onClick={() => setExpanded(!expanded)}>
        <TableCell>
          <div className="flex items-center gap-3 font-semibold group-hover:opacity-80 transition-opacity" style={{ color: THEME.BSI_DARK_GRAY }}>
            {expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>} {week.weekRange}
          </div>
        </TableCell>
        <TableCell className="text-center font-medium" style={{ color: THEME.BSI_GREY }}>
          {week.tasks?.filter((t: any) => t.status === PROJECT_STATUS.COMPLETED).length} / {week.tasks?.length || 0}
        </TableCell>
        <TableCell className="min-w-[120px]">
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${week.progress}%`, backgroundColor: color }} />
          </div>
        </TableCell>
        <TableCell className="text-center font-bold relative" style={{ color: THEME.TOSCA }}>
            <div className="flex items-center justify-center gap-3">
                <span>{week.progress}%</span>
                <Button 
                    variant="ghost" size="icon" 
                    onClick={(e) => { e.stopPropagation(); onRequestDeleteLog(week.id); }} 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all absolute right-2 hover:bg-red-50"
                    style={{ color: THEME.BSI_LIGHT_GRAY }}
                >
                    <Trash2 className="h-3.5 w-3.5" style={{ color: THEME.ORANGE }} />
                </Button>
            </div>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow className="bg-gray-50/30 animate-in slide-in-from-top-1">
          <TableCell colSpan={4} className="p-4">
            <div className="grid gap-2">
              {week.tasks?.length > 0 ? week.tasks?.map((t: any) => {
                const isDone = t.status === PROJECT_STATUS.COMPLETED;
                return (
                  <div key={t.id} className="flex items-center justify-center sm:justify-between p-3 rounded-xl border shadow-sm transition-all bg-white group/task" style={{ borderColor: isDone ? THEME.TOSCA + '50' : THEME.BSI_LIGHT_GRAY + '30' }}>
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={(e) => handleCheck(t.id, e)} 
                        className="h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors"
                        style={{ 
                          backgroundColor: isDone ? THEME.TOSCA : THEME.BSI_WHITE,
                          borderColor: isDone ? THEME.TOSCA : THEME.BSI_LIGHT_GRAY
                        }}
                      >
                        {loadingId === t.id ? <Loader2 className="h-3 w-3 animate-spin text-white"/> : isDone && <CheckCircle2 className="h-3.5 w-3.5 text-white"/>}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isDone ? 'line-through opacity-60' : ''}`} style={{ color: isDone ? THEME.TOSCA : THEME.BSI_DARK_GRAY }}>{t.taskName}</p>
                        <p className="text-[10px] font-mono" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t.taskId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold ${isDone ? '' : ''}`} style={{ color: isDone ? THEME.TOSCA : THEME.BSI_GREY, borderColor: isDone ? THEME.TOSCA + '40' : THEME.BSI_LIGHT_GRAY + '50' }}>{isDone ? 'DONE' : 'WIP'}</Badge>
                        <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); onRequestDeleteTask(t.id); }}
                            className="h-6 w-6 opacity-0 group-hover/task:opacity-100 transition-all hover:bg-red-50"
                        >
                             <X className="h-3.5 w-3.5" style={{ color: THEME.ORANGE }} />
                        </Button>
                    </div>
                  </div>
                );
              }) : <div className="text-center text-xs py-2 italic" style={{ color: THEME.BSI_LIGHT_GRAY }}>No tasks assigned.</div>}
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
    if (project.status === PROJECT_STATUS.COMPLETED) return { globalPct: 100, completedPhases: 6 };
    const idx = PHASES_ARRAY.indexOf(project.currentPhase);
    const progressInCurrentPhase = Number(project.overallProgress) || 0;
    return { globalPct: Math.round(((idx * 100) + progressInCurrentPhase) / 600 * 100), completedPhases: progressInCurrentPhase === 100 ? idx + 1 : idx };
  }, [project.currentPhase, project.overallProgress, project.status]);

  const phaseDict = useMemo(() => {
    const dict: Record<string, any> = {};
    if (project.sdlcPhases) {
      project.sdlcPhases.forEach((p: any) => dict[p.phaseName] = p);
    }
    return dict;
  }, [project.sdlcPhases]);

  const accentColor = project.status.includes('track') || project.status === PROJECT_STATUS.COMPLETED ? PROGRESS_COLORS.track : PROGRESS_COLORS.risk;

  return (
    <Card 
      className={`border-none shadow-md bg-white overflow-hidden scroll-mt-24 rounded-2xl group transition-all duration-300 ${highlight ? 'ring-2 shadow-lg scale-[1.01]' : 'ring-1'}`} 
      style={{ '--tw-ring-color': highlight ? THEME.TOSCA : THEME.BSI_LIGHT_GRAY + '40' } as React.CSSProperties}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
      <CardHeader className="pb-6 pt-6 px-7 text-left">
        <div className="flex justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border" style={{ color: THEME.TOSCA, backgroundColor: THEME.TOSCA + '10', borderColor: THEME.TOSCA + '30' }}>{project.id}</span>
              <StatusBadge value={project.status} />
              {project.cycle > 1 && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">Cycle {project.cycle}</Badge>}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold" style={{ color: THEME.BSI_DARK_GRAY }}>{project.name}</CardTitle>
                <div className="flex gap-4 text-xs pt-3 font-medium" style={{ color: THEME.BSI_GREY }}>
                  <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><User className="h-3.5 w-3.5" style={{ color: THEME.BSI_YELLOW }} /> {project.pic || "Unassigned"}</span>
                  <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><LayoutDashboard className="h-3.5 w-3.5" style={{ color: THEME.TOSCA }} /> {project.currentPhase}</span>
                </div>
              </div>
              <Button onClick={() => onViewGantt(project)} variant="outline" className="h-9 text-xs gap-2 rounded-xl shadow-none hover:text-white" style={{ color: THEME.TOSCA, borderColor: THEME.TOSCA + '50', backgroundColor: THEME.TOSCA + '10' }}><Map className="h-3.5 w-3.5" /> View Gantt</Button>
            </div>
          </div>
          <div className="text-right min-w-[120px] pl-6 border-l hidden md:block" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: THEME.BSI_LIGHT_GRAY }}>Overall Progress</p>
            <p className="text-4xl font-black" style={{ color: THEME.TOSCA }}>{globalPct}<span className="text-2xl ml-1" style={{ color: THEME.BSI_LIGHT_GRAY }}>%</span></p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: THEME.BSI_GREY }}>{completedPhases} of 6 phases done</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-2 px-7 pb-8 text-left">
        <div className="space-y-4">
          <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}><Map className="h-4 w-4" style={{ color: THEME.TOSCA }} /> SDLC Roadmap</h4>
          <div className="rounded-xl border overflow-hidden shadow-sm bg-white overflow-x-auto" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <Table>
              <TableHeader style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '15' }}>
                <TableRow>
                  {["Phase Step", "Timeline", "Status"].map((h, i) => <TableHead key={i} className={`text-[10px] font-bold uppercase h-10 ${i===2?'text-center':''}`} style={{ color: THEME.BSI_GREY }}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PHASES_ARRAY.map((ph, idx) => {
                  const pData = phaseDict[ph]; 
                  const curIdx = PHASES_ARRAY.indexOf(project.currentPhase);
                  const stat = idx < curIdx ? PROJECT_STATUS.COMPLETED : (idx === curIdx ? (Number(project.overallProgress) === 100 ? PROJECT_STATUS.COMPLETED : project.status) : PROJECT_STATUS.PENDING);
                  return (
                    <TableRow key={ph} className={stat === PROJECT_STATUS.PENDING ? "opacity-60" : ""} style={{ backgroundColor: stat === PROJECT_STATUS.PENDING ? THEME.BSI_LIGHT_GRAY + '10' : '' }}>
                      <TableCell className="py-3 font-semibold text-xs" style={{ color: THEME.BSI_DARK_GRAY }}>{idx + 1}. {ph}</TableCell>
                      <TableCell className="text-[11px] font-medium py-3" style={{ color: THEME.BSI_GREY }}>{pData ? `${fmtDate(pData.startDate)} - ${fmtDate(pData.deadline)}` : "-"}</TableCell>
                      <TableCell className="text-center py-3"><StatusBadge value={stat} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}><Clock className="h-4 w-4" style={{ color: THEME.TOSCA }} /> Weekly Logs</h4>
          <div className="rounded-xl border overflow-hidden shadow-sm bg-white" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <Table>
              <TableHeader style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '15' }}>
                <TableRow>{["Period", "Tasks", "Progress", "%"].map((h, i) => <TableHead key={i} className={`text-[10px] font-bold uppercase h-10 ${i!==1?'text-center':''}`} style={{ color: THEME.BSI_GREY }}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {project.weeklyProgress?.length ? project.weeklyProgress.map((w: any, idx: number) => 
                    <WeeklyRow key={idx} week={w} projectStatus={project.status} onTaskToggle={onRefresh} onRequestDeleteLog={onDeleteLog} onRequestDeleteTask={onDeleteTask} />
                ) : <TableRow><TableCell colSpan={4} className="text-center text-xs py-8 italic" style={{ color: THEME.BSI_LIGHT_GRAY }}>No updates logged yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
ProjectCard.displayName = "ProjectCard";

const LogActivityForm = memo(({ projects, onSuccess }: { projects: Project[], onSuccess: () => void }) => {
  const [logForm, setLogForm] = useState({ pid: "", week: "", tasks: "" });
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!logForm.pid || !logForm.week) return;
    setIsLogging(true);
    try {
      await api.post(`/project/log`, { 
        projectId: logForm.pid, 
        weekRange: logForm.week, 
        tasks: logForm.tasks.split('\n').filter(t => t), 
        progress: 0 
      });
      setLogForm({ pid: "", week: "", tasks: "" }); 
      onSuccess();
    } catch (err: any) { 
      alert(err.message || "Log failed"); 
    } finally { 
      setIsLogging(false); 
    }
  };

  return (
    <form onSubmit={handleLog} className="space-y-4">
      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Project</Label><DashboardSelect value={logForm.pid} onChange={(e: any) => setLogForm({...logForm, pid: e.target.value})}><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</DashboardSelect></div>
      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Period (Week)</Label><DashboardInput placeholder="e.g. Sprint 1" value={logForm.week} onChange={(e: any) => setLogForm({...logForm, week: e.target.value})} /></div>
      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Assign Tasks</Label><DashboardTextarea value={logForm.tasks} onChange={(e: any) => setLogForm({...logForm, tasks: e.target.value})} placeholder="Enter tasks (one per line)..." className="min-h-[120px]" /></div>
      <Button type="submit" disabled={isLogging || !logForm.pid || !logForm.week || !logForm.tasks} className="w-full font-bold text-white shadow-md h-10 rounded-xl hover:opacity-90" style={{ backgroundColor: THEME.TOSCA }}>{isLogging ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save & Assign Tasks"}</Button>
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
      const data = await api.get(`/project`, { signal });
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
        const endpoint = deleteConf.type === 'log' 
            ? `/project/log/${deleteConf.id}`
            : `/project/task/${deleteConf.id}`;
        
        await api.delete(endpoint);

        setDeleteConf(null); 
        await fetchData();   
    } catch (e: any) {
        alert(e.message || "System error.");
    } finally {
        setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => (!filter || filter === 'all') ? projects : projects.filter(p => p.status === filter), [projects, filter]);

  // Logika Warna untuk Filter Banner
  const filterStyle = useMemo(() => {
    if (!filter || filter === 'all') return { bg: THEME.TOSCA + '15', text: THEME.TOSCA, border: THEME.TOSCA + '30' };
    if (filter === PROJECT_STATUS.ON_TRACK) return { bg: THEME.BSI_GREEN + '15', text: THEME.BSI_GREEN, border: THEME.BSI_GREEN + '30' };
    if (filter === PROJECT_STATUS.AT_RISK) return { bg: THEME.BSI_YELLOW + '15', text: THEME.BSI_YELLOW, border: THEME.BSI_YELLOW + '30' };
    // 🔥 Overdue background menjadi merah (#E11D48)
    if (filter === PROJECT_STATUS.OVERDUE) return { bg: '#E11D4815', text: '#E11D48', border: '#E11D4830' };
    return { bg: THEME.BSI_LIGHT_GRAY + '15', text: THEME.BSI_GREY, border: THEME.BSI_LIGHT_GRAY + '30' };
  }, [filter]);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold animate-pulse text-lg" style={{ color: THEME.TOSCA }}>Loading Timelines...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-1 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: THEME.BSI_DARK_GRAY }}>{view === 'list' ? "Project Timeline & Tracking" : `Gantt View: ${selProject?.name}`}</h2>
          {view === 'detail' && <Button variant="outline" onClick={() => { setView('list'); setSelProject(null); }} className="gap-2 h-9 rounded-xl border-gray-200 hover:bg-gray-50" style={{ color: THEME.BSI_GREY }}><ArrowLeft className="h-4 w-4"/> Back to Timeline</Button>}
        </div>
        <p className="text-sm font-medium" style={{ color: THEME.BSI_LIGHT_GRAY }}>Real-time monitoring of project SDLC phases and weekly deliverables.</p>
      </div>

      {view === 'list' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {l:"On Track", s: PROJECT_STATUS.ON_TRACK, i:CheckCircle2, c:PROGRESS_COLORS.track}, 
              {l:"At Risk", s: PROJECT_STATUS.AT_RISK, i:AlertCircle, c:PROGRESS_COLORS.risk}, 
              {l:"Overdue", s: PROJECT_STATUS.OVERDUE, i:Timer, c:PROGRESS_COLORS.overdue}, 
              {l:"Active Projects", s:'all', i:LayoutDashboard, c:THEME.BSI_GREEN}
            ].map((k,i) => (
              <DashboardKpiCard key={i} label={k.l} count={projects.filter(p => k.s === 'all' ? true : p.status === k.s).length} icon={k.i} color={k.c} active={filter === k.s} onClick={() => setFilter(filter === k.s ? null : k.s)} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-8">
              {filter && filter !== 'all' && (
                <div className="border px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-left-2" style={{ backgroundColor: filterStyle.bg, color: filterStyle.text, borderColor: filterStyle.border }}>
                  <Filter className="h-4 w-4"/> Filtering By: <span className="uppercase tracking-wide">{filter.replace('-', ' ')}</span>
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
                  <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center" style={{ color: THEME.BSI_LIGHT_GRAY, borderColor: THEME.BSI_LIGHT_GRAY + '50' }}>
                    <FolderKanban className="h-12 w-12 mb-2 opacity-50"/>
                    <p className="font-medium text-gray-500">No projects found for the selected filter.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-6 space-y-6">
                <DashboardCard color={THEME.TOSCA} title="Quick Navigation" icon={Filter} className="max-h-[350px] overflow-hidden" contentClassName="space-y-2 overflow-y-auto pr-2 px-3 pb-5 h-[250px] custom-scrollbar">
                  {filtered.map(p => (
                    <button key={p.id} onClick={() => scrollTo(p.id)} className="w-full text-left p-2.5 rounded-lg flex items-center justify-between group cursor-pointer border border-transparent transition-all hover:bg-gray-50">
                      <div className="truncate pr-2"><span className="text-xs font-bold block truncate transition-colors" style={{ color: THEME.BSI_DARK_GRAY }}>{p.name}</span><span className="text-[10px]" style={{ color: THEME.BSI_LIGHT_GRAY }}>{p.id}</span></div>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" style={{ color: THEME.BSI_LIGHT_GRAY }} />
                    </button>
                  ))}
                </DashboardCard>

                <DashboardCard color={THEME.BSI_GREEN} title="Log Team Activity" icon={PlusCircle} contentClassName="pt-5 px-5 pb-6 text-left">
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
                    <div 
                      className="p-4 rounded-full ring-4" 
                      style={{ 
                        backgroundColor: THEME.ORANGE + '15', 
                        color: THEME.ORANGE, 
                        '--tw-ring-color': THEME.ORANGE + '30' 
                      } as React.CSSProperties}
                    >
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-lg font-bold" style={{ color: THEME.BSI_DARK_GRAY }}>
                            Delete {deleteConf?.type === 'log' ? 'Weekly Log' : 'Task'}?
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium" style={{ color: THEME.BSI_GREY }}>
                            {deleteConf?.type === 'log' 
                                ? "This will permanently remove the log and all tasks inside it. This action cannot be undone."
                                : "This task will be removed permanently. Progress will be recalculated."}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <DialogFooter className="mt-6 flex gap-2 w-full">
                <Button variant="outline" onClick={() => setDeleteConf(null)} className="flex-1 rounded-xl h-11 font-bold border-gray-300" style={{ color: THEME.BSI_DARK_GRAY }}>Cancel</Button>
                <Button onClick={executeDelete} disabled={isDeleting} className="flex-1 rounded-xl text-white h-11 font-bold border-none hover:opacity-90" style={{ backgroundColor: THEME.ORANGE }}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}