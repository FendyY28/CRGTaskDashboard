import type { Task } from "gantt-task-react";

import { SDLC_PHASES } from "../../../constants/projectConstants";
import { fmtDate } from "../../../../lib/utils";

/** One day in milliseconds — the unit used for all Gantt date math. */
export const DAY_MS = 86400000;

export const PHASE_ORDER = Object.values(SDLC_PHASES);

export const STATUS_COLORS = {
  ON_TRACK: {
    solid: "#00A39D",
    bg: "#E6FFFA",
    border: "#99F6E4",
    text: "#0F766E",
  },
  AT_RISK: {
    solid: "#F59E0B",
    bg: "#FEF3C7",
    border: "#FDE68A",
    text: "#B45309",
  },
  OVERDUE: {
    solid: "#DC2626",
    bg: "#FEE2E2",
    border: "#FECACA",
    text: "#B91C1C",
  },
  NOT_STARTED: {
    solid: "#9CA3AF",
    bg: "#F3F4F6",
    border: "#D1D5DB",
    text: "#6B7280",
  },
};

export type StatusKey = keyof typeof STATUS_COLORS;

interface SdlcPhase {
  phaseName: string;
  cycle?: number | null;
  startDate?: string | null;
  deadline?: string | null;
  progress?: number | string | null;
  status?: string | null;
}

interface ProjectLike {
  cycle?: number | null;
  currentPhase?: string | null;
  overallProgress?: number | string | null;
  status?: string | null;
  projectStartDate?: string | null;
  projectDeadline?: string | null;
  sdlcPhases?: SdlcPhase[] | null;
}

/** Parse to a valid Date, or `null` when the value is absent/unparseable. */
const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** Filter the project's phases down to the selected cycle. */
export const getCyclePhases = (
  project: ProjectLike | null | undefined,
  selectedCycle: number
): SdlcPhase[] => {
  if (!project?.sdlcPhases) return [];
  return project.sdlcPhases.filter((p) => (p.cycle || 1) === selectedCycle);
};

/**
 * Earliest phase start and latest phase deadline for a cycle, falling back to
 * the project-level dates when the cycle has no dated phases.
 */
export const getCycleDateRange = (
  cyclePhases: SdlcPhase[],
  project: ProjectLike | null | undefined
) => {
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  for (const p of cyclePhases) {
    const start = parseDate(p.startDate);
    if (start && (!minStart || start.getTime() < minStart.getTime())) {
      minStart = start;
    }
    const end = parseDate(p.deadline);
    if (end && (!maxEnd || end.getTime() > maxEnd.getTime())) {
      maxEnd = end;
    }
  }

  return {
    start: minStart ? fmtDate(minStart.toISOString()) : fmtDate(project?.projectStartDate),
    end: maxEnd ? fmtDate(maxEnd.toISOString()) : fmtDate(project?.projectDeadline),
  };
};

/**
 * Resolve a phase's progress + status.
 *
 * Archived cycles (`selectedCycle < maxCycle`) are locked to their stored data.
 * The active cycle mirrors the live project progress for `currentPhase`.
 */
const resolvePhaseProgress = (
  dbPhase: SdlcPhase | undefined,
  phaseName: string,
  project: ProjectLike,
  isArchived: boolean
): { progress: number; effectiveStatus: string } => {
  if (isArchived) {
    if (!dbPhase) return { progress: 0, effectiveStatus: "pending" };

    const progress =
      dbPhase.status === "completed"
        ? Number(dbPhase.progress) > 0
          ? Number(dbPhase.progress)
          : 100
        : Number(dbPhase.progress) || 0;

    return {
      progress,
      effectiveStatus: dbPhase.status
        ? dbPhase.status.toLowerCase()
        : dbPhase.startDate
          ? "completed"
          : "pending",
    };
  }

  if (!dbPhase) return { progress: 0, effectiveStatus: "pending" };

  let progress = Number(dbPhase.progress) || 0;
  let effectiveStatus = dbPhase.status ? dbPhase.status.toLowerCase() : "pending";

  if (phaseName === project.currentPhase) {
    progress = Number(project.overallProgress) || 0;
    effectiveStatus = project.status || "on-track";
  }

  return { progress, effectiveStatus };
};

/** Map progress/lateness onto the four Gantt bar statuses. */
const resolveStatusKey = (
  progress: number,
  effectiveStatus: string,
  isDateOverdue: boolean
): StatusKey => {
  const isNotStarted = progress === 0 && effectiveStatus === "pending";

  if (isNotStarted) return "NOT_STARTED";
  if (isDateOverdue || effectiveStatus === "overdue") return "OVERDUE";
  if (effectiveStatus === "at-risk") return "AT_RISK";
  return "ON_TRACK";
};

/**
 * Build the Gantt rows for a project's selected cycle.
 *
 * Phases are laid out back-to-back: a phase without a stored start date
 * continues from the previous phase's end + 1 day, and a phase without a
 * deadline spans 7 days.
 */
export const buildGanttTasks = (
  project: ProjectLike | null | undefined,
  cyclePhases: SdlcPhase[],
  selectedCycle: number,
  maxCycle: number
): Task[] => {
  if (!project) return [];

  try {
    let baselineStart = new Date();
    const firstPhaseStart = parseDate(cyclePhases[0]?.startDate);
    const projectStart = parseDate(project.projectStartDate);

    if (cyclePhases.length > 0 && firstPhaseStart) {
      baselineStart = firstPhaseStart;
    } else if (projectStart) {
      baselineStart = projectStart;
    }

    let runningDate = new Date(baselineStart);
    const isArchived = selectedCycle < maxCycle;

    return PHASE_ORDER.map((phaseName, index) => {
      const dbPhase = cyclePhases.find((p) => p.phaseName === phaseName);

      const storedStart = parseDate(dbPhase?.startDate);
      const start = storedStart ?? new Date(runningDate);

      const storedEnd = parseDate(dbPhase?.deadline);
      let end = storedEnd ?? new Date(start.getTime() + DAY_MS * 7);

      if (end <= start) {
        end = new Date(start.getTime() + DAY_MS);
      }

      // Next undated phase continues the day after this one ends.
      runningDate = new Date(end.getTime() + DAY_MS);

      const { progress, effectiveStatus } = resolvePhaseProgress(
        dbPhase,
        phaseName,
        project,
        isArchived
      );

      const isDateOverdue = new Date() > end && progress < 100;
      const statusKey = resolveStatusKey(progress, effectiveStatus, isDateOverdue);
      const statusConfig = STATUS_COLORS[statusKey];

      const barColor =
        statusKey === "NOT_STARTED" ? "transparent" : statusConfig.solid;
      const barBg = statusConfig.bg;

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
          backgroundSelectedColor: barBg,
        },
      } as Task;
    });
  } catch (e) {
    console.error("Gantt Chart Calculation Error:", e);
    return [];
  }
};
