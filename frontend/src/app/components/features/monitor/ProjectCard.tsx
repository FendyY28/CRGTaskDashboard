import { useState, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { User, LayoutDashboard, Map, CheckCircle2, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { StatusBadge } from "../../dashboard/index";
import { DoneTasksTable } from "./DoneTasksTable";
import { WeeklyLogsSection } from "./WeeklyLogsSection";
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
  const [logsOpen, setLogsOpen] = useState(false);
  const [logSearch, setLogSearch] = useState("");

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

  const weeklyLogs = useMemo(() => project.weeklyProgress ?? [], [project.weeklyProgress]);

  const filteredWeeks = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return weeklyLogs;
    return weeklyLogs.filter((w) => w.weekRange?.toLowerCase().includes(q));
  }, [weeklyLogs, logSearch]);

  return (
    <Card
      className={`border border-white/60 shadow-xl shadow-teal-950/5 bg-white/95 overflow-hidden scroll-mt-24 rounded-2xl group transition-all duration-300 ring-1 ring-black/5 ${highlight ? 'ring-2 shadow-2xl' : ''}`}
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
          <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}><CheckCircle2 className="h-4 w-4" style={{ color: THEME.TOSCA }} /> {t('timeline.projectCard.tasksDone', 'Tasks Done')}</h4>
          <DoneTasksTable project={project} />
        </div>
{/* WEEKLY LOGS â€” catatan mingguan + task (toggle / tambah / hapus) */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setLogsOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 text-left"
            aria-expanded={logsOpen}
          >
            <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}>
              <ClipboardList className="h-4 w-4" style={{ color: THEME.TOSCA }} /> {t('timeline.projectCard.weeklyLogs')}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: THEME.TOSCA + '15', color: THEME.TOSCA }}
              >
                {weeklyLogs.length}
              </span>
            </h4>
            {logsOpen ? <ChevronUp className="h-4 w-4" style={{ color: THEME.BSI_LIGHT_GRAY }} /> : <ChevronDown className="h-4 w-4" style={{ color: THEME.BSI_LIGHT_GRAY }} />}
          </button>

          {logSearch.trim() && (
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder={t('timeline.projectCard.searchLogs', 'Cari periode...')}
              className="w-full h-9 px-3 text-xs rounded-xl border bg-white outline-none focus:ring-2 focus:ring-[#38A79C]/30"
              style={{ borderColor: THEME.BSI_LIGHT_GRAY + '60', color: THEME.BSI_DARK_GRAY }}
            />
          )}

          {logsOpen ? (
            <WeeklyLogsSection
              weeks={filteredWeeks}
              projectStatus={project.status}
              onRefresh={onRefresh}
              onRequestDeleteLog={onDeleteLog}
              onRequestDeleteTask={onDeleteTask}
            />
          ) : (
            <p className="text-[11px] italic" style={{ color: THEME.BSI_LIGHT_GRAY }}>
              {t('timeline.projectCard.expandLogsHint', 'Klik untuk melihat dan mengelola catatan mingguan.')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
ProjectCard.displayName = "ProjectCard";
