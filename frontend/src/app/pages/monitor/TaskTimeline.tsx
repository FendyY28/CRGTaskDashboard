import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CheckCircle2, LayoutDashboard, AlertCircle, Timer, Filter, PlusCircle, ArrowRight, Loader2, ArrowLeft, FolderKanban, X, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { ProjectGantt } from "../../components/features/monitor/ProjectGantt";
import { DashboardKpiCard, DashboardCard } from "../../components/dashboard/index";
import { PROJECT_STATUS, THEME } from "../../constants/projectConstants"; 
import { api } from "../../services/api"; 
import type { Project } from "../../types";

import { ProjectCard } from "../../components/features/monitor/ProjectCard";
import { LogActivityForm } from "../../components/features/monitor/LogActivityForm";
import { ProtectAction } from "../../components/auth/ProtectAction";

import { useTranslation } from "react-i18next";

const PROGRESS_COLORS = { track: THEME.TOSCA, risk: THEME.BSI_YELLOW, overdue: "#E11D48" }; 

export function TaskTimeline() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selProject, setSelProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  
  const [deleteConf, setDeleteConf] = useState<{ type: 'log' | 'task', id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { t } = useTranslation();

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
        alert(e.message || t('timeline.toast.systemError'));
    } finally {
        setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => (!filter || filter === 'all') ? projects : projects.filter(p => p.status === filter), [projects, filter]);

  const filterStyle = useMemo(() => {
    if (!filter || filter === 'all') return { bg: THEME.TOSCA + '15', text: THEME.TOSCA, border: THEME.TOSCA + '30' };
    if (filter === PROJECT_STATUS.ON_TRACK) return { bg: THEME.BSI_GREEN + '15', text: THEME.BSI_GREEN, border: THEME.BSI_GREEN + '30' };
    if (filter === PROJECT_STATUS.AT_RISK) return { bg: THEME.BSI_YELLOW + '15', text: THEME.BSI_YELLOW, border: THEME.BSI_YELLOW + '30' };
    if (filter === PROJECT_STATUS.OVERDUE) return { bg: '#E11D4815', text: '#E11D48', border: '#E11D4830' };
    return { bg: THEME.BSI_LIGHT_GRAY + '15', text: THEME.BSI_GREY, border: THEME.BSI_LIGHT_GRAY + '30' };
  }, [filter]);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold animate-pulse text-lg" style={{ color: THEME.TOSCA }}>{t('timeline.loading')}</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-1 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: THEME.BSI_DARK_GRAY }}>
            {view === 'list' ? t('timeline.title') : t('timeline.ganttView', { name: selProject?.name })}
          </h2>
          {view === 'detail' && (
            <Button variant="outline" onClick={() => { setView('list'); setSelProject(null); }} className="gap-2 h-9 rounded-xl border-gray-200 hover:bg-gray-50" style={{ color: THEME.BSI_GREY }}>
              <ArrowLeft className="h-4 w-4"/> {t('timeline.backToTimeline')}
            </Button>
          )}
        </div>
        <p className="text-sm font-medium" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t('timeline.description')}</p>
      </div>

      {view === 'list' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {l: t('timeline.kpi.onTrack'), s: PROJECT_STATUS.ON_TRACK, i:CheckCircle2, c:PROGRESS_COLORS.track}, 
              {l: t('timeline.kpi.atRisk'), s: PROJECT_STATUS.AT_RISK, i:AlertCircle, c:PROGRESS_COLORS.risk}, 
              {l: t('timeline.kpi.overdue'), s: PROJECT_STATUS.OVERDUE, i:Timer, c:PROGRESS_COLORS.overdue}, 
              {l: t('timeline.kpi.activeProjects'), s:'all', i:LayoutDashboard, c:THEME.BSI_GREEN}
            ].map((k,i) => (
              <DashboardKpiCard key={i} label={k.l} count={projects.filter(p => k.s === 'all' ? true : p.status === k.s).length} icon={k.i} color={k.c} active={filter === k.s} onClick={() => setFilter(filter === k.s ? null : k.s)} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-8">
              {filter && filter !== 'all' && (
                <div className="border px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-left-2" style={{ backgroundColor: filterStyle.bg, color: filterStyle.text, borderColor: filterStyle.border }}>
                  <Filter className="h-4 w-4"/> {t('timeline.filteringBy')} <span className="uppercase tracking-wide">{filter.replace('-', ' ')}</span>
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
                    <p className="font-medium text-gray-500">{t('timeline.noProjectsFound')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-6 space-y-6">
                <DashboardCard color={THEME.TOSCA} title={t('timeline.quickNavigation')} icon={Filter} className="max-h-[350px] overflow-hidden" contentClassName="space-y-2 overflow-y-auto pr-2 px-3 pb-5 h-[250px] custom-scrollbar">
                  {filtered.map(p => (
                    <button key={p.id} onClick={() => scrollTo(p.id)} className="w-full text-left p-2.5 rounded-lg flex items-center justify-between group cursor-pointer border border-transparent transition-all hover:bg-gray-50">
                      <div className="truncate pr-2"><span className="text-xs font-bold block truncate transition-colors" style={{ color: THEME.BSI_DARK_GRAY }}>{p.name}</span><span className="text-[10px]" style={{ color: THEME.BSI_LIGHT_GRAY }}>{p.id}</span></div>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" style={{ color: THEME.BSI_LIGHT_GRAY }} />
                    </button>
                  ))}
                </DashboardCard>

                <ProtectAction>
                  <DashboardCard color={THEME.BSI_GREEN} title={t('timeline.logTeamActivity')} icon={PlusCircle} contentClassName="pt-5 px-5 pb-6 text-left">
                    <LogActivityForm projects={projects} onSuccess={fetchData} />
                  </DashboardCard>
                </ProtectAction>
              </div>
            </div>
          </div>
        </>
      ) : selProject && <ProjectGantt project={selProject} onBack={() => { setView('list'); setSelProject(null); }} />}

      <ProtectAction>
        <Dialog open={!!deleteConf} onOpenChange={(open) => !open && setDeleteConf(null)}>
          <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[400px] text-center p-8">
              <DialogHeader>
                  <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-red-50 rounded-full text-red-600 ring-4 ring-red-50/50">
                          <AlertTriangle className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                          <DialogTitle className="text-lg font-bold" style={{ color: THEME.BSI_DARK_GRAY }}>
                              {deleteConf?.type === 'log' ? t('timeline.deleteModal.titleLog') : t('timeline.deleteModal.titleTask')}
                          </DialogTitle>
                          <DialogDescription className="text-sm font-medium" style={{ color: THEME.BSI_GREY }}>
                              {deleteConf?.type === 'log' ? t('timeline.deleteModal.descLog') : t('timeline.deleteModal.descTask')}
                          </DialogDescription>
                      </div>
                  </div>
              </DialogHeader>
              <DialogFooter className="mt-6 flex gap-2 w-full">
                  <Button variant="outline" onClick={() => setDeleteConf(null)} className="flex-1 rounded-xl h-11 font-bold border-gray-300" style={{ color: THEME.BSI_DARK_GRAY }}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="destructive" onClick={executeDelete} disabled={isDeleting} className="flex-1 rounded-xl h-11 font-bold border-none bg-red-600 hover:bg-red-700 transition-colors">
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.delete')}
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </ProtectAction>
    </div>
  );
}