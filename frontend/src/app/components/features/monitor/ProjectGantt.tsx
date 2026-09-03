import { useState, useMemo, useEffect } from "react";
import { Gantt, type Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Calendar as CalendarIcon, ArrowLeft, RefreshCw, Layers, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { SDLC_PHASES, THEME } from "../../../constants/projectConstants";
import { useTranslation } from "react-i18next";
import { fmtDate } from "../../../../lib/utils";

const PHASE_ORDER = Object.values(SDLC_PHASES);

const STATUS_COLORS = {
  ON_TRACK: { solid: "#00A39D", bg: "#E6FFFA", border: "#99F6E4", text: "#0F766E" },
  AT_RISK: { solid: "#F59E0B", bg: "#FEF3C7", border: "#FDE68A", text: "#B45309" },
  OVERDUE: { solid: "#DC2626", bg: "#FEE2E2", border: "#FECACA", text: "#B91C1C" },
  NOT_STARTED: { solid: "#9CA3AF", bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280" }
};

export function ProjectGantt({ project, onBack }: { project: any; onBack: () => void }) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const maxCycle = project?.cycle || 1;
  const [selectedCycle, setSelectedCycle] = useState<number>(maxCycle);

  useEffect(() => {
    if (project?.cycle) setSelectedCycle(project.cycle);
  }, [project?.cycle]);

  // Cari semua fase khusus cycle yang dipilih
  const cyclePhases = useMemo(() => {
    if (!project?.sdlcPhases) return [];
    return project.sdlcPhases.filter((p: any) => (p.cycle || 1) === selectedCycle);
  }, [project?.sdlcPhases, selectedCycle]);

  // Hitung rentang tanggal awal & akhir siklus yang dipilih
  const cycleDateRange = useMemo(() => {
    let minStart: Date | null = null;
    let maxEnd: Date | null = null;

    for (const p of cyclePhases) {
      if (p.startDate) {
        const d = new Date(p.startDate);
        if (!isNaN(d.getTime()) && (!minStart || d.getTime() < minStart.getTime())) {
          minStart = d;
        }
      }
      if (p.deadline) {
        const d = new Date(p.deadline);
        if (!isNaN(d.getTime()) && (!maxEnd || d.getTime() > maxEnd.getTime())) {
          maxEnd = d;
        }
      }
    }

    return {
      start: minStart ? fmtDate(minStart.toISOString()) : fmtDate(project?.projectStartDate),
      end: maxEnd ? fmtDate(maxEnd.toISOString()) : fmtDate(project?.projectDeadline)
    };
  }, [cyclePhases, project]);

  const tasks: Task[] = useMemo(() => {
    if (!project) return [];

    try {
      // Tentukan baseline fallback tanggal awal untuk cycle yang dipilih
      let baselineStart: Date = new Date();
      if (cyclePhases.length > 0 && cyclePhases[0].startDate) {
        const d = new Date(cyclePhases[0].startDate);
        if (!isNaN(d.getTime())) baselineStart = d;
      } else if (project.projectStartDate) {
        const d = new Date(project.projectStartDate);
        if (!isNaN(d.getTime())) baselineStart = d;
      }

      let runningDate = new Date(baselineStart);

      return PHASE_ORDER.map((phaseName, index) => {
        // Ambil data fase dari database untuk cycle ini
        const dbPhase = cyclePhases.find((p: any) => p.phaseName === phaseName);

        // Tentukan Tanggal Mulai & Selesai yang rapi & berurutan
        let start: Date;
        if (dbPhase?.startDate) {
          const d = new Date(dbPhase.startDate);
          start = !isNaN(d.getTime()) ? d : new Date(runningDate);
        } else {
          start = new Date(runningDate);
        }

        let end: Date;
        if (dbPhase?.deadline) {
          const d = new Date(dbPhase.deadline);
          end = !isNaN(d.getTime()) ? d : new Date(start.getTime() + 86400000 * 7);
        } else {
          end = new Date(start.getTime() + 86400000 * 7); // Default 7 hari
        }

        if (end <= start) {
          end = new Date(start.getTime() + 86400000);
        }

        // Simpan runningDate untuk fase berikutnya jika fase berikutnya belum punya tanggal
        runningDate = new Date(end.getTime() + 86400000);

        // LOGIKA STATUS & PROGRESS PER FASE
        let progress = 0;
        let effectiveStatus = "pending";

        if (selectedCycle < maxCycle) {
          // 🔒 CYCLE LAMA (ARSIP): Terkunci permanen, data murni dari database
          if (dbPhase) {
            progress = dbPhase.status === "completed" ? (Number(dbPhase.progress) > 0 ? Number(dbPhase.progress) : 100) : (Number(dbPhase.progress) || 0);
            effectiveStatus = dbPhase.status ? dbPhase.status.toLowerCase() : (dbPhase.startDate ? "completed" : "pending");
          } else {
            progress = 0;
            effectiveStatus = "pending";
          }
        } else {
          // ⚡ CYCLE AKTIF:
          if (dbPhase) {
            progress = Number(dbPhase.progress) || 0;
            effectiveStatus = dbPhase.status ? dbPhase.status.toLowerCase() : "pending";

            // Jika fase ini adalah fase aktif saat ini, sinkronkan dengan status & progress live project
            if (phaseName === project.currentPhase) {
              progress = Number(project.overallProgress) || 0;
              effectiveStatus = project.status || "on-track";
            }
          }
        }

        const isDateOverdue = new Date() > end && progress < 100;
        const isNotStarted = progress === 0 && effectiveStatus === "pending";

        // WARNA GANTT CHART SESUAI KONDISI FASE (On Track, At Risk, Overdue, Not Started)
        let statusKey: 'ON_TRACK' | 'AT_RISK' | 'OVERDUE' | 'NOT_STARTED' = 'ON_TRACK';
        let barColor = STATUS_COLORS.ON_TRACK.solid;
        let barBg = STATUS_COLORS.ON_TRACK.bg;

        if (isNotStarted) {
          statusKey = 'NOT_STARTED';
          barColor = "transparent";
          barBg = STATUS_COLORS.NOT_STARTED.bg;
        } else if (isDateOverdue || effectiveStatus === "overdue") {
          statusKey = 'OVERDUE';
          barColor = STATUS_COLORS.OVERDUE.solid;
          barBg = STATUS_COLORS.OVERDUE.bg;
        } else if (effectiveStatus === "at-risk") {
          statusKey = 'AT_RISK';
          barColor = STATUS_COLORS.AT_RISK.solid;
          barBg = STATUS_COLORS.AT_RISK.bg;
        } else {
          statusKey = 'ON_TRACK';
          barColor = STATUS_COLORS.ON_TRACK.solid;
          barBg = STATUS_COLORS.ON_TRACK.bg;
        }

        const statusConfig = STATUS_COLORS[statusKey];

        return {
          id: `phase-${index}_${phaseName}_${selectedCycle}`,
          name: phaseName,
          type: "task",
          start,
          end,
          progress,
          isDisabled: true,
          custom_status: effectiveStatus,
          custom_status_key: statusKey,
          custom_color: statusConfig.solid,
          custom_phase: phaseName,
          custom_is_overdue: isDateOverdue,
          styles: {
            progressColor: barColor,
            progressSelectedColor: barColor,
            backgroundColor: barBg,
            backgroundSelectedColor: barBg
          }
        };
      });
    } catch (e) {
      console.error("Gantt Chart Calculation Error:", e);
      return [];
    }
  }, [project, cyclePhases, selectedCycle, maxCycle]);

  return (
    <Card className="border-none shadow-md ring-1 ring-gray-100 bg-white overflow-hidden mb-6 rounded-2xl">
      <CardHeader className="pb-4 border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9 hover:bg-gray-100 rounded-full border border-gray-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarIcon className="h-5 w-5 text-[#36A39D]" />
                <CardTitle className="text-xl font-bold text-gray-800 tracking-tight">
                  {project?.name || "Project Details"}
                </CardTitle>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md border" style={{ color: THEME.TOSCA, backgroundColor: THEME.TOSCA + '10', borderColor: THEME.TOSCA + '30' }}>
                  {project?.id}
                </span>
                {selectedCycle < maxCycle ? (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none">
                    {t('gantt.archiveCycle')}
                  </Badge>
                ) : (
                  <Badge className="bg-teal-50 text-teal-700 border-teal-200 shadow-none">
                    {t('gantt.activeCycle')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium ml-7 flex items-center gap-2 mt-0.5">
                <span>{t('gantt.title')}</span>
                <span className="text-gray-300">•</span>
                <span className="font-semibold text-gray-700">{t('gantt.cycleLabel')} {selectedCycle}</span>
                <span className="text-gray-300">•</span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {t('gantt.cycleRange', { start: cycleDateRange.start, end: cycleDateRange.end })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Navigasi / Filter Cycle Tabs */}
            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase px-2 mr-0.5 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-gray-400" /> {t('gantt.cycleLabel')}
              </span>
              {Array.from({ length: maxCycle }, (_, i) => i + 1).map((c) => {
                const isActive = selectedCycle === c;
                const isCurrentLive = c === maxCycle;
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedCycle(c)}
                    className={`text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-white text-[#36A39D] shadow-xs ring-1 ring-gray-200/60"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                    }`}
                  >
                    <span>{c}</span>
                    {isCurrentLive ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-6 w-[1px] bg-gray-200 mx-0.5 hidden sm:block"></div>

            {/* View Mode Dropdown */}
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[115px] h-9 text-xs font-semibold bg-white border-gray-200 shadow-xs rounded-xl">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ViewMode.Day}>{t('gantt.viewMode.day')}</SelectItem>
                <SelectItem value={ViewMode.Week}>{t('gantt.viewMode.week')}</SelectItem>
                <SelectItem value={ViewMode.Month}>{t('gantt.viewMode.month')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto bg-white min-h-[340px] relative">
        {tasks.length > 0 ? (
          <div className="w-full">
            <Gantt
              tasks={tasks}
              viewMode={viewMode}
              columnWidth={viewMode === ViewMode.Month ? 100 : viewMode === ViewMode.Week ? 60 : 45}
              listCellWidth="180px"
              barFill={72}
              rowHeight={50}
              fontFamily="Inter, sans-serif"
              fontSize="12px"
              headerHeight={48}
              arrowColor="#CBD5E1"
              barCornerRadius={6}
              TooltipContent={({ task, fontSize, fontFamily }) => {
                const phaseName = (task as any).custom_phase || task.name;
                const statusKey = (task as any).custom_status_key as keyof typeof STATUS_COLORS || 'ON_TRACK';
                const statusConfig = STATUS_COLORS[statusKey] || STATUS_COLORS.ON_TRACK;
                const rawStatus = (task as any).custom_status ? (task as any).custom_status.toLowerCase() : "";
                const isOverdue = (task as any).custom_is_overdue;

                let statusText = t('gantt.tooltip.onTrack');
                if (statusKey === 'OVERDUE' || isOverdue || rawStatus === "overdue") {
                  statusText = t('gantt.tooltip.overdue');
                } else if (statusKey === 'AT_RISK' || rawStatus === "at-risk") {
                  statusText = t('gantt.tooltip.atRisk');
                } else if (task.progress === 100 || rawStatus === "completed") {
                  statusText = t('gantt.tooltip.completed');
                } else if (statusKey === 'NOT_STARTED' || (task.progress === 0 && rawStatus === "pending")) {
                  statusText = t('gantt.tooltip.notStarted');
                }

                return (
                  <div
                    style={{
                      background: "#fff",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      boxShadow: "0 14px 28px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)",
                      fontSize,
                      fontFamily,
                      border: `1px solid ${statusConfig.border}`,
                      minWidth: "220px"
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: statusConfig.solid }}
                        />
                        <b className="text-gray-900 text-sm font-bold">{phaseName}</b>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold px-2 py-0.5"
                        style={{ color: statusConfig.solid, borderColor: statusConfig.border, backgroundColor: statusConfig.bg }}
                      >
                        {task.progress}%
                      </Badge>
                    </div>

                    <div className="text-[11px] text-gray-500 mb-2.5 pb-2 border-b border-gray-100 flex items-center gap-1.5 font-mono">
                      <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                      <span>{fmtDate(task.start.toISOString())} — {fmtDate(task.end.toISOString())}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-gray-400 uppercase tracking-wider">{t('gantt.tooltip.status')}:</span>
                      <span
                        className="px-2 py-0.5 rounded-md flex items-center gap-1"
                        style={{ color: statusConfig.text, backgroundColor: statusConfig.bg }}
                      >
                        {statusKey === 'OVERDUE' ? (
                          <AlertTriangle className="h-3 w-3 text-[#DC2626]" />
                        ) : statusKey === 'AT_RISK' ? (
                          <AlertTriangle className="h-3 w-3 text-[#F59E0B]" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-[#00A39D]" />
                        )}
                        {statusText}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <style>{`
              rect[fill="transparent"] { stroke: #9CA3AF; stroke-width: 1.5px; stroke-dasharray: 4; opacity: 0.8; }
              .gantt-table-cell { font-weight: 600; color: #374151; }
            `}</style>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers className="h-12 w-12 mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">
              {t('gantt.noData', { cycle: selectedCycle })}
            </p>
            <Button variant="link" onClick={() => setSelectedCycle(1)} className="text-[#36A39D] font-bold text-xs mt-1">
              {t('gantt.checkCycle1')}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modern Status Condition Legend */}
      <div className="border-t border-gray-100 p-4 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {t('gantt.legend.statusTitle', 'Kondisi Fase:')}
          </span>
        </div>

        {/* Status Cue Legend */}
        <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#99F6E4] shadow-2xs">
            <div className="w-3 h-3 rounded-full bg-[#00A39D]" />
            <span className="text-[#0F766E]">{t('gantt.tooltip.onTrack', 'On Track')} / {t('gantt.tooltip.completed', 'Completed')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#FDE68A] shadow-2xs">
            <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
            <span className="text-[#B45309]">{t('gantt.tooltip.atRisk', 'At Risk')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-[#FECACA] shadow-2xs">
            <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
            <span className="text-[#B91C1C]">{t('gantt.tooltip.overdue', 'Overdue')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-gray-200 shadow-2xs">
            <div className="w-3 h-3 rounded-sm border border-dashed border-gray-400 bg-transparent" />
            <span className="text-gray-500">{t('gantt.tooltip.notStarted', 'Not Started')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}