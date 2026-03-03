import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { User, Clock, LayoutDashboard, Map } from "lucide-react";
import { StatusBadge } from "../../dashboard/index";
import { WeeklyRow } from "./WeeklyRow";
import { fmtDate } from "../../../../lib/utils";
import { SDLC_PHASES, PROJECT_STATUS, THEME } from "../../../constants/projectConstants"; 

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