import { ViewMode } from "gantt-task-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Calendar as CalendarIcon, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { THEME } from "../../../constants/projectConstants";
import { useTranslation } from "react-i18next";
import type { ProjectGanttProject } from "./ganttData";

interface GanttHeaderProps {
  project: ProjectGanttProject;
  onBack: () => void;
  selectedCycle: number;
  maxCycle: number;
  onSelectCycle: (cycle: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  cycleDateRange: { start: string; end: string };
}

export function GanttHeader({
  project,
  onBack,
  selectedCycle,
  maxCycle,
  onSelectCycle,
  viewMode,
  onViewModeChange,
  cycleDateRange,
}: GanttHeaderProps) {
  const { t } = useTranslation();

  return (
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
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              {project?.name || "Project Details"}
            </h2>
            <span
              className="text-label font-bold px-2.5 py-0.5 rounded-md border"
              style={{
                color: THEME.TOSCA,
                backgroundColor: THEME.TOSCA + "10",
                borderColor: THEME.TOSCA + "30",
              }}
            >
              {project?.id}
            </span>
            {selectedCycle < maxCycle ? (
              <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 shadow-none">
                {t("gantt.archiveCycle")}
              </Badge>
            ) : (
              <Badge className="text-xs bg-teal-50 text-teal-700 border-teal-200 shadow-none">
                {t("gantt.activeCycle")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium ml-7 flex items-center gap-2 mt-0.5">
            <span>{t("gantt.title")}</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-gray-700">
              {t("gantt.cycleLabel")} {selectedCycle}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500 font-mono">
              {t("gantt.cycleRange", {
                start: cycleDateRange.start,
                end: cycleDateRange.end,
              })}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Navigasi / Filter Cycle Tabs */}
        <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-bold text-gray-600 uppercase px-2 mr-0.5 flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5 text-gray-400" />{" "}
            {t("gantt.cycleLabel")}
          </span>
          {Array.from({ length: maxCycle }, (_, i) => i + 1).map((c) => {
            const isActive = selectedCycle === c;
            const isCurrentLive = c === maxCycle;
            return (
              <button
                key={c}
                onClick={() => onSelectCycle(c)}
                className={`text-sm px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
        <Select
          value={viewMode}
          onValueChange={(v) => onViewModeChange(v as ViewMode)}
        >
          <SelectTrigger className="w-[115px] h-9 text-xs font-semibold bg-white border-gray-200 shadow-xs rounded-xl">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ViewMode.Day}>
              {t("gantt.viewMode.day")}
            </SelectItem>
            <SelectItem value={ViewMode.Week}>
              {t("gantt.viewMode.week")}
            </SelectItem>
            <SelectItem value={ViewMode.Month}>
              {t("gantt.viewMode.month")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
