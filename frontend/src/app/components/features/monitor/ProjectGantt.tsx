import { useState, useMemo, useEffect } from "react";
import { Gantt, type Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "./ProjectGantt.css";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Layers } from "lucide-react";
import { Button } from "../../ui/button";
import { useTranslation } from "react-i18next";
import {
  buildGanttTasks,
  getCycleDateRange,
  getCyclePhases,
  normalizeCycle,
  type ProjectGanttProject,
} from "./ganttData";
import { GanttHeader } from "./GanttHeader";
import { GanttTaskTooltip } from "./GanttTaskTooltip";
import { GanttStatusLegend } from "./GanttStatusLegend";

export function ProjectGantt({
  project,
  onBack,
}: {
  project: ProjectGanttProject;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const maxCycle = useMemo(() => normalizeCycle(project?.cycle), [project?.cycle]);
  // Re-sync when the user opens a different project's timeline.
  const [selectedCycle, setSelectedCycle] = useState<number>(maxCycle);
  useEffect(() => {
    setSelectedCycle(normalizeCycle(project?.cycle));
  }, [project?.id, project?.cycle]);

  // Fase khusus cycle yang dipilih.
  const cyclePhases = useMemo(
    () => getCyclePhases(project, selectedCycle),
    [project, selectedCycle],
  );

  // Rentang tanggal awal & akhir siklus yang dipilih.
  const cycleDateRange = useMemo(
    () => getCycleDateRange(cyclePhases, project),
    [cyclePhases, project],
  );

  const tasks: Task[] = useMemo(
    () => buildGanttTasks(project, cyclePhases, selectedCycle, maxCycle),
    [project, cyclePhases, selectedCycle, maxCycle],
  );

  return (
    <Card className="border-none shadow-md ring-1 ring-gray-100 bg-white overflow-hidden mb-6 rounded-2xl">
      <CardHeader className="pb-4 border-b border-gray-100 bg-white px-6 py-5">
        <GanttHeader
          project={project}
          onBack={onBack}
          selectedCycle={selectedCycle}
          maxCycle={maxCycle}
          onSelectCycle={setSelectedCycle}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          cycleDateRange={cycleDateRange}
        />
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto bg-white min-h-[340px] relative">
        {tasks.length > 0 ? (
          <div
            className={`w-full gantt-chart-container gantt-view-${viewMode.toLowerCase()}`}
          >
            <Gantt
              tasks={tasks}
              viewMode={viewMode}
              columnWidth={
                viewMode === ViewMode.Month
                  ? 100
                  : viewMode === ViewMode.Week
                    ? 60
                    : 45
              }
              listCellWidth="180px"
              barFill={72}
              rowHeight={50}
              fontFamily="Inter, sans-serif"
              fontSize="12px"
              headerHeight={48}
              arrowColor="#CBD5E1"
              barCornerRadius={6}
              TooltipContent={({ task, fontSize, fontFamily }) => (
                <GanttTaskTooltip
                  task={task}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                />
              )}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers className="h-12 w-12 mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">
              {t("gantt.noData", { cycle: selectedCycle })}
            </p>
            <Button
              variant="link"
              onClick={() => setSelectedCycle(1)}
              className="text-[#36A39D] font-bold text-sm mt-1"
            >
              {t("gantt.checkCycle1")}
            </Button>
          </div>
        )}
      </CardContent>

      <GanttStatusLegend />
    </Card>
  );
}
