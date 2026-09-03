import { useState, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { User, Clock, LayoutDashboard, Map, CheckCircle2, ArrowRight, Search, X } from "lucide-react";
import { StatusBadge } from "../../dashboard/index";
import { WeeklyRow } from "./WeeklyRow";
import { fmtDate } from "../../../../lib/utils";
import { SDLC_PHASES, PROJECT_STATUS, THEME } from "../../../constants/projectConstants"; 
import { useTranslation } from "react-i18next";

const PHASES_ARRAY = Object.values(SDLC_PHASES);
const PROGRESS_COLORS = { track: THEME.TOSCA, risk: THEME.BSI_YELLOW, overdue: "#E11D48" };

interface ProjectCardProps {
  project: any;
  onRefresh: () => void;
  onViewGantt: (project: any) => void;
  highlight: boolean;
  onDeleteLog: (id: number) => void;
  onDeleteTask: (id: number) => void;
}

export const ProjectCard = memo(({ project, onRefresh, onViewGantt, highlight, onDeleteLog, onDeleteTask }: ProjectCardProps) => {
  const { t } = useTranslation();
  const [showAllModal, setShowAllModal] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");

  const { globalPct, completedPhases } = useMemo(() => {
    if (project.status === PROJECT_STATUS.COMPLETED) return { globalPct: 100, completedPhases: 6 };
    const idx = PHASES_ARRAY.indexOf(project.currentPhase);
    const progressInCurrentPhase = Number(project.overallProgress) || 0;
    return { globalPct: Math.round(((idx * 100) + progressInCurrentPhase) / 600 * 100), completedPhases: progressInCurrentPhase === 100 ? idx + 1 : idx };
  }, [project.currentPhase, project.overallProgress, project.status]);

  const phaseDict = useMemo(() => {
    const dict: Record<string, any> = {};
    const curCycle = project.cycle || 1;
    if (project.sdlcPhases) {
      project.sdlcPhases
        .filter((p: any) => (p.cycle || 1) === curCycle)
        .forEach((p: any) => dict[p.phaseName] = p);
    }
    return dict;
  }, [project.sdlcPhases, project.cycle]);

  const accentColor = project.status.includes('track') || project.status === PROJECT_STATUS.COMPLETED ? PROGRESS_COLORS.track : PROGRESS_COLORS.risk;

  return (
    <Card 
      className={`border border-white/60 shadow-xl shadow-teal-950/5 bg-white/95 backdrop-blur-md overflow-hidden scroll-mt-24 rounded-2xl group transition-all duration-300 ring-1 ring-black/5 ${highlight ? 'ring-2 shadow-2xl scale-[1.01]' : ''}`} 
      style={{ '--tw-ring-color': highlight ? THEME.TOSCA : undefined } as React.CSSProperties}
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
                  <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><User className="h-3.5 w-3.5" style={{ color: THEME.BSI_YELLOW }} /> {project.pic || t('timeline.projectCard.unassigned')}</span>
                  <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full"><LayoutDashboard className="h-3.5 w-3.5" style={{ color: THEME.TOSCA }} /> {project.currentPhase}</span>
                </div>
              </div>
              <Button onClick={() => onViewGantt(project)} variant="outline" className="h-9 text-xs gap-2 rounded-xl shadow-none hover:text-white" style={{ color: THEME.TOSCA, borderColor: THEME.TOSCA + '50', backgroundColor: THEME.TOSCA + '10' }}><Map className="h-3.5 w-3.5" /> {t('timeline.projectCard.viewGantt')}</Button>
            </div>
          </div>
          <div className="text-right min-w-[120px] pl-6 border-l hidden md:block" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t('timeline.projectCard.overallProgress')}</p>
            <p className="text-4xl font-black" style={{ color: THEME.TOSCA }}>{globalPct}<span className="text-2xl ml-1" style={{ color: THEME.BSI_LIGHT_GRAY }}>%</span></p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: THEME.BSI_GREY }}>{t('timeline.projectCard.phasesDone', { completed: completedPhases })}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-2 px-7 pb-8 text-left">
        <div className="space-y-4">
          <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}><Map className="h-4 w-4" style={{ color: THEME.TOSCA }} /> {t('timeline.projectCard.sdlcRoadmap')}</h4>
          <div className="rounded-xl border overflow-hidden shadow-sm bg-white overflow-x-auto" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <Table>
              <TableHeader style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '15' }}>
                <TableRow>
                  {[t('timeline.projectCard.tableHeaders.phaseStep'), t('timeline.projectCard.tableHeaders.timeline'), t('timeline.projectCard.tableHeaders.status')].map((h, i) => <TableHead key={i} className={`text-[10px] font-bold uppercase h-10 ${i===2?'text-center':''}`} style={{ color: THEME.BSI_GREY }}>{h}</TableHead>)}
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
          <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}><Clock className="h-4 w-4" style={{ color: THEME.TOSCA }} /> {t('timeline.projectCard.weeklyLogs')}</h4>
          <div className="rounded-xl border overflow-hidden shadow-sm bg-white" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <Table>
              <TableHeader style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '15' }}>
                <TableRow>{[t('timeline.projectCard.tableHeaders.period'), t('timeline.projectCard.tableHeaders.tasks'), t('timeline.projectCard.tableHeaders.progress'), t('timeline.projectCard.tableHeaders.percent')].map((h, i) => <TableHead key={i} className={`text-[10px] font-bold uppercase h-10 ${i!==1?'text-center':''}`} style={{ color: THEME.BSI_GREY }}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {project.weeklyProgress?.length ? project.weeklyProgress.map((w: any, idx: number) => 
                    <WeeklyRow key={idx} week={w} projectStatus={project.status} onTaskToggle={onRefresh} onRequestDeleteLog={onDeleteLog} onRequestDeleteTask={onDeleteTask} />
                ) : <TableRow><TableCell colSpan={4} className="text-center text-xs py-8 italic" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t('timeline.projectCard.noWeeklyLogs')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ACTIVITY LOG — Rekam jejak task yang telah selesai */}
        {(() => {
          const allDoneTasks = (project.weeklyProgress ?? [])
            .flatMap((w: any) => (w.tasks ?? []).map((t: any) => ({ ...t, weekRange: w.weekRange })))
            .filter((t: any) => t && (t.status === 'completed' || t.status === PROJECT_STATUS.COMPLETED))
            .sort((a: any, b: any) => {
              const timeA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
              const timeB = b.completedDate ? new Date(b.completedDate).getTime() : 0;
              return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });

          if (allDoneTasks.length === 0) return null;

          const formatDateSafe = (dateVal?: string | null) => {
            if (!dateVal) return null;
            try {
              const d = new Date(dateVal);
              if (isNaN(d.getTime())) return null;
              return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              }).format(d);
            } catch {
              return null;
            }
          };

          const previewTasks = allDoneTasks.slice(0, 5);

          const filteredModalTasks = allDoneTasks.filter((t: any) => {
            if (!activitySearch.trim()) return true;
            const q = activitySearch.toLowerCase();
            return (
              t.taskName?.toLowerCase().includes(q) ||
              t.taskId?.toLowerCase().includes(q) ||
              t.weekRange?.toLowerCase().includes(q) ||
              t.completedBy?.toLowerCase().includes(q)
            );
          });

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}>
                  <CheckCircle2 className="h-4 w-4" style={{ color: THEME.BSI_GREEN }} /> {t('timeline.projectCard.activityLog')}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: THEME.BSI_GREEN + '15', color: THEME.BSI_GREEN }}>
                    {t('timeline.projectCard.completedCount', { count: allDoneTasks.length })}
                  </span>
                </h4>

                {allDoneTasks.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setActivitySearch(""); setShowAllModal(true); }}
                    className="h-7 text-xs font-bold gap-1 rounded-lg hover:bg-teal-50"
                    style={{ color: THEME.TOSCA }}
                  >
                    {t('timeline.projectCard.seeAll', { count: allDoneTasks.length })} <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="rounded-xl border overflow-hidden shadow-sm bg-white" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
                <div className="divide-y" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '30' }}>
                  {previewTasks.map((t: any, idx: number) => {
                    const formattedDate = formatDateSafe(t.completedDate);
                    return (
                      <div key={t.id ?? idx} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                        {/* Icon done */}
                        <div className="h-7 w-7 min-w-[28px] rounded-full flex items-center justify-center" style={{ backgroundColor: THEME.BSI_GREEN + '15' }}>
                          <CheckCircle2 className="h-4 w-4" style={{ color: THEME.BSI_GREEN }} />
                        </div>

                        {/* Task name + period */}
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-semibold truncate" style={{ color: THEME.BSI_DARK_GRAY }}>{t.taskName || "Untitled Task"}</p>
                          <p className="text-[10px] font-mono" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t.taskId} · {t.weekRange}</p>
                        </div>

                        {/* Completed by & date */}
                        <div className="text-right shrink-0 space-y-0.5">
                          {t.completedBy ? (
                            <p className="text-xs font-semibold flex items-center justify-end gap-1" style={{ color: THEME.BSI_DARK_GRAY }}>
                              <User className="h-3 w-3" style={{ color: THEME.BSI_LIGHT_GRAY }} />
                              {t.completedBy}
                            </p>
                          ) : (
                            <p className="text-xs italic" style={{ color: THEME.BSI_LIGHT_GRAY }}>—</p>
                          )}
                          {formattedDate && (
                            <p className="text-[10px]" style={{ color: THEME.BSI_LIGHT_GRAY }}>
                              {formattedDate}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DIALOG MODAL: LIHAT SEMUA ACTIVITY LOG */}
              <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
                <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[620px] p-0 overflow-hidden max-h-[85vh] flex flex-col">
                  <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" style={{ color: THEME.BSI_GREEN }} />
                          {t('timeline.projectCard.modal.title', { name: project.name })}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 mt-0.5">
                          {t('timeline.projectCard.modal.description', { count: allDoneTasks.length })}
                        </DialogDescription>
                      </div>
                    </div>

                    {/* Search inside modal */}
                    <div className="relative mt-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        placeholder={t('timeline.projectCard.modal.searchPlaceholder')}
                        className="w-full h-9 pl-9 pr-9 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#36A39D]/30 focus:border-[#36A39D] text-gray-800 placeholder-gray-400"
                      />
                      {activitySearch && (
                        <button onClick={() => setActivitySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 max-h-[450px]">
                    {filteredModalTasks.length > 0 ? (
                      filteredModalTasks.map((t: any, idx: number) => {
                        const formattedDate = formatDateSafe(t.completedDate);
                        return (
                          <div key={t.id ?? idx} className="flex items-center gap-4 px-3 py-3 hover:bg-gray-50 rounded-xl transition-colors">
                            <div className="h-7 w-7 min-w-[28px] rounded-full flex items-center justify-center" style={{ backgroundColor: THEME.BSI_GREEN + '15' }}>
                              <CheckCircle2 className="h-4 w-4" style={{ color: THEME.BSI_GREEN }} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-semibold truncate text-gray-900">{t.taskName || "Untitled Task"}</p>
                              <p className="text-[11px] font-mono text-gray-400">{t.taskId} · {t.weekRange}</p>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              {t.completedBy ? (
                                <p className="text-xs font-semibold flex items-center justify-end gap-1 text-gray-800">
                                  <User className="h-3 w-3 text-gray-400" />
                                  {t.completedBy}
                                </p>
                              ) : (
                                <p className="text-xs italic text-gray-400">—</p>
                              )}
                              {formattedDate && (
                                <p className="text-[10px] text-gray-400">
                                  {formattedDate}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-gray-400 text-xs italic">
                        {t('timeline.projectCard.modal.noSearchResults', { query: activitySearch })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
});
ProjectCard.displayName = "ProjectCard";