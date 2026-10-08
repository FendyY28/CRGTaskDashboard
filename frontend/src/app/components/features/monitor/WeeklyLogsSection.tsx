import { memo, useMemo } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { WeeklyRow } from "./WeeklyRow";
import { THEME } from "../../../constants/projectConstants";
import { useTranslation } from "react-i18next";
import { computeWeeklyTotals } from "../../../../lib/utils";
import type { ProjectStatus, WeeklyProgress } from "../../../types";

/** Kolom header tabel weekly logs — styling terpusat di satu tempat. */
const WEEKLY_COLUMNS = [
  { key: "title", labelKey: "timeline.projectCard.tableHeaders.title", center: false },
  { key: "period", labelKey: "timeline.projectCard.tableHeaders.period", center: false },
  { key: "tasks", labelKey: "timeline.projectCard.tableHeaders.tasks", center: true },
  { key: "progress", labelKey: "timeline.projectCard.tableHeaders.progress", center: false },
  { key: "percent", labelKey: "timeline.projectCard.tableHeaders.percent", center: true },
] as const;

interface WeeklyLogsSectionProps {
  weeks: WeeklyProgress[];
  projectStatus: ProjectStatus;
  onRefresh: () => void;
  onRequestDeleteLog: (id: number) => void;
  onRequestDeleteTask: (id: number) => void;
}

/**
 * WEEKLY LOGS — daftar catatan mingguan + task di dalamnya.
 *
 * Sengaja tidak di-mount sampai user menekan tombol expand (lihat ProjectCard)
 * supaya halaman Timeline tidak ikut berat saat project/task banyak.
 * Baris tabel (WeeklyRow) sudah di-memoize, jadi tabel ini hanya dihitung
 * ulang saat data weekly berubah.
 */
export const WeeklyLogsSection = memo(
  ({
    weeks,
    projectStatus,
    onRefresh,
    onRequestDeleteLog,
    onRequestDeleteTask,
  }: WeeklyLogsSectionProps) => {
    const { t } = useTranslation();

    const totals = useMemo(() => computeWeeklyTotals(weeks), [weeks]);

    if (weeks.length === 0) {
      return (
        <div
          className="rounded-xl border border-dashed py-6 text-center text-xs italic"
          style={{ borderColor: THEME.BSI_LIGHT_GRAY + "50", color: THEME.BSI_LIGHT_GRAY }}
        >
          {t("timeline.projectCard.noWeeklyLogs")}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: THEME.BSI_GREY }}>
          <span>
            {t("timeline.projectCard.weeklyLogs")}: <strong>{weeks.length}</strong>
          </span>
          <span style={{ color: THEME.BSI_LIGHT_GRAY }}>•</span>
          <span>
            {t("timeline.projectCard.completedCount", { count: totals.doneCount })} / {totals.taskCount} ({totals.overall}%)
          </span>
        </div>

        <div
          className="rounded-xl border overflow-hidden shadow-sm bg-white overflow-x-auto"
          style={{ borderColor: THEME.BSI_LIGHT_GRAY + "40" }}
        >
          <Table>
            <TableHeader style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + "15" }}>
              <TableRow>
                {WEEKLY_COLUMNS.map(({ key, labelKey, center }) => (
                  <TableHead
                    key={key}
                    className={`text-[10px] font-bold uppercase h-10${center ? " text-center" : ""}`}
                    style={{ color: THEME.BSI_GREY }}
                  >
                    {t(labelKey)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeks.map((week) => (
                <WeeklyRow
                  key={week.id}
                  week={week}
                  projectStatus={projectStatus}
                  onTaskToggle={onRefresh}
                  onRequestDeleteLog={onRequestDeleteLog}
                  onRequestDeleteTask={onRequestDeleteTask}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
);

WeeklyLogsSection.displayName = "WeeklyLogsSection";