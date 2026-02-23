import { useState, useMemo, useEffect } from "react";
import { Gantt, type Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Calendar as CalendarIcon, ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const PHASE_ORDER = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];

const COLORS = { 
  OK: "#36A39D",       
  RISK: "#F59E0B",     
  LATE: "#DC2626",     
  PLAN: "#E5E7EB",
  SOLID_PLAN: "#9CA3AF"
};

const getStyle = (status: string, progress: number, isDateOverdue: boolean) => {
  const s = status ? status.toLowerCase() : "";
  if (s === 'overdue' || (progress < 100 && isDateOverdue)) return { bar: COLORS.LATE, bg: "#FEE2E2", solid: COLORS.LATE };
  if (s === 'at-risk') return { bar: COLORS.RISK, bg: "#FFFBEB", solid: COLORS.RISK };
  if (progress === 0 || s === 'pending') return { bar: "transparent", bg: "#F3F4F6", solid: COLORS.SOLID_PLAN };
  return { bar: COLORS.OK, bg: "#F0FDFA", solid: COLORS.OK };
};

export function ProjectGantt({ project, onBack }: { project: any; onBack: () => void }) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  // Ambil cycle terbesar (yang sedang aktif)
  const maxCycle = project?.cycle || 1;
  const [selectedCycle, setSelectedCycle] = useState<number>(maxCycle);

  // Auto-sync cycle ketika data project berubah/refresh
  useEffect(() => {
    if (project?.cycle) setSelectedCycle(project.cycle);
  }, [project?.cycle]);

  const tasks: Task[] = useMemo(() => {
    if (!project?.sdlcPhases) return [];

    try {
        // Hanya ambil fase-fase yang sesuai dengan Cycle yang dipilih di Dropdown
        const phases = project.sdlcPhases.filter((p: any) => (p.cycle || 1) === selectedCycle);
        if (phases.length === 0) return [];

        return phases.map((p: any, i: number) => {
            const now = new Date();
            const start = p.startDate ? new Date(p.startDate) : now;
            let end = p.deadline ? new Date(p.deadline) : new Date(start.getTime() + 86400000); 

            // Prevent error if end date is before start date
            if (end <= start) {
                end = new Date(start.getTime() + 86400000); 
            }

            // Logika Status & Progress
            // Apakah fase ini adalah fase yang BENAR-BENAR sedang berjalan SAAT INI?
            const isActivePhase = p.phaseName === project.currentPhase && selectedCycle === maxCycle;
            
            // Apakah fase ini sudah lewat di Cycle yang aktif?
            const isPastPhase = PHASE_ORDER.indexOf(p.phaseName) < PHASE_ORDER.indexOf(project.currentPhase);
            
            // Apakah kita sedang melihat History (Siklus masa lalu)?
            const isHistoryCycle = selectedCycle < maxCycle;

            let effectiveStatus = p.status;
            let progress = p.progress || 0; 

            if (isActivePhase) {
                effectiveStatus = project.status;
                progress = Number(project.overallProgress) || 0;
            } else if (isHistoryCycle) {
                // Di riwayat masa lalu, biarkan status apa adanya (misal: 'at-risk' / 'completed')
                // Tapi progress kita paksa 100 karena fase itu pasti sudah selesai/terlewati
                progress = 100; 
            } else if (isPastPhase || effectiveStatus === 'completed') {
                progress = 100;
            }
            
            const isDateOverdue = new Date() > end;
            const style = getStyle(effectiveStatus, progress, isDateOverdue);

            return {
                id: `phase-${p.id || i}_${p.phaseName}_${selectedCycle}`, 
                name: p.phaseName || "Phase", 
                type: 'task',
                start, 
                end, 
                progress, 
                isDisabled: true, // Read-only di Gantt
                custom_status: effectiveStatus, 
                custom_color: style.solid,
                styles: { 
                    progressColor: style.bar,        
                    progressSelectedColor: style.bar, 
                    backgroundColor: style.bg,        
                    backgroundSelectedColor: style.bg 
                }
            };
        }).sort((a: any, b: any) => (PHASE_ORDER.indexOf(a.name) + 1 || 99) - (PHASE_ORDER.indexOf(b.name) + 1 || 99));
    } catch (e) {
        console.error("Gantt Chart Calculation Error:", e);
        return []; 
    }
  }, [project, selectedCycle, maxCycle]);

  return (
    <Card className="border-none shadow-md ring-1 ring-gray-100 bg-white overflow-hidden mb-6">
      <CardHeader className="pb-4 border-b border-gray-50 bg-white px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 hover:bg-gray-100 rounded-full border border-gray-200"><ArrowLeft className="h-4 w-4 text-gray-600" /></Button>
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-[#36A39D]" />
                <CardTitle className="text-xl font-bold text-gray-800 tracking-tight">{project?.name || "Project Details"}</CardTitle>
                {selectedCycle < maxCycle && <Badge className="bg-amber-100 text-amber-700 shadow-none hover:bg-amber-200 ml-2">History Archive</Badge>}
              </div>
              <p className="text-xs text-gray-400 font-medium ml-7 flex items-center gap-1">Gantt Timeline <span className="text-gray-300">•</span> Cycle {selectedCycle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Navigasi / Filter Cycle */}
            <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase px-2 mr-1 flex items-center gap-1"><RefreshCw className="h-3 w-3"/> Cycle</span>
              {Array.from({ length: maxCycle }, (_, i) => i + 1).map((c) => (
                <button 
                  key={c} 
                  onClick={() => setSelectedCycle(c)} 
                  className={`text-xs px-3 py-1 rounded-md font-bold transition-all ${selectedCycle === c ? "bg-white text-[#36A39D] shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            
            <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>
            
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[110px] h-9 text-xs font-medium bg-white border-gray-200 shadow-sm"><SelectValue placeholder="View" /></SelectTrigger>
              <SelectContent>{[ViewMode.Day, ViewMode.Week, ViewMode.Month].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-x-auto bg-white min-h-[350px] relative">
        {tasks.length > 0 ? (
            <div className="min-w-[800px]">
                <Gantt 
                    tasks={tasks} 
                    viewMode={viewMode} 
                    columnWidth={viewMode === ViewMode.Month ? 150 : 60} 
                    listCellWidth="180px" 
                    barFill={70} 
                    rowHeight={55} 
                    fontFamily="Inter, sans-serif" 
                    fontSize="12px" 
                    headerHeight={50} 
                    arrowColor="#9CA3AF" 
                    barCornerRadius={4}
                    TooltipContent={({ task, fontSize, fontFamily }) => {
                        const rawStatus = (task as any).custom_status ? (task as any).custom_status.toLowerCase() : "";
                        let statusLabel = "ON TRACK"; 
                        if (rawStatus === 'overdue') statusLabel = "OVERDUE";
                        else if (rawStatus === 'at-risk') statusLabel = "AT RISK";
                        else if (task.progress === 0 && rawStatus !== 'overdue') statusLabel = "NOT STARTED";
                        
                        return (
                            <div style={{ background: "#fff", padding: "12px", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", fontSize, fontFamily, border: "1px solid #f3f4f6", minWidth: "200px" }}>
                                <div className="flex items-center justify-between mb-2">
                                    <b className="text-gray-800">{task.name}</b>
                                    {task.progress > 0 && <Badge variant="outline" className="text-[10px]" style={{ color: (task as any).custom_color, borderColor: (task as any).custom_color }}>{task.progress}%</Badge>}
                                </div>
                                <div className="text-[10px] text-gray-500 mb-2 border-b border-gray-100 pb-2">{task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}</div>
                                <div className="text-[10px] font-bold" style={{ color: (task as any).custom_color }}>
                                    {statusLabel}
                                </div>
                            </div>
                        );
                    }}
                />
                <style>{`rect[fill="transparent"] { stroke: #D1D5DB; stroke-width: 1px; stroke-dasharray: 4; opacity: 0.6; }`}</style>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Layers className="h-12 w-12 mb-3 text-gray-200" /><p>No timeline data for <span className="font-bold text-gray-500">Cycle {selectedCycle}</span></p>
                <Button variant="link" onClick={() => setSelectedCycle(1)} className="text-[#36A39D]">Check Cycle 1</Button>
            </div>
        )}
      </CardContent>
      {/* Legend Footer */}
      <div className="border-t border-gray-50 p-3 bg-gray-50/50 flex items-center gap-6 text-[10px] text-gray-500 justify-center">
          {[ {l:"On Track", c:"bg-[#36A39D]"}, {l:"At Risk", c:"bg-[#F59E0B]"}, {l:"Overdue", c:"bg-[#DC2626]"} ].map((i,k) => (
              <div key={k} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-sm ${i.c}`}></div> {i.l}</div>
          ))}
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm border border-dashed border-gray-400 bg-transparent"></div> Not Started</div>
      </div>
    </Card>
  );
}