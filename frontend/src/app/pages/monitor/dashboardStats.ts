import type { Project } from "../../types";
import { SDLC_PHASES, PROJECT_STATUS } from "../../constants/projectConstants";

export interface DashboardStats {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  newThisMonthCount: number;
  deliveredThisMonthCount: number;
}

export interface PhaseBreakdownItem {
  phase: string;
  progress: number;
  count: number;
  projects: Project[];
  status: string;
}

const PHASES_LIST = Object.values(SDLC_PHASES);

/** True when both dates fall in the same month and year. */
const sameMonth = (a: Date, b: Date): boolean =>
  a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

/**
 * Derive the KPI counters and the per-phase breakdown shown on the overview
 * dashboard from the project list. Pure so it can be unit-tested directly.
 */
export function computeDashboardStats(
  projects: Project[],
  currentDate: Date = new Date(),
): { dashboardStats: DashboardStats; phaseBreakdown: PhaseBreakdownItem[] } {
  const statsCounter: DashboardStats = {
    totalCount: 0,
    activeCount: 0,
    completedCount: 0,
    newThisMonthCount: 0,
    deliveredThisMonthCount: 0,
  };
  const projectsGroupedByPhase: Record<string, Project[]> = {};

  projects.forEach((project) => {
    statsCounter.totalCount++;

    if (sameMonth(new Date(project.createdAt), currentDate)) {
      statsCounter.newThisMonthCount++;
    }

    const isProjectCompleted =
      project.currentPhase === SDLC_PHASES.LIVE && Number(project.overallProgress) === 100;

    if (isProjectCompleted) {
      statsCounter.completedCount++;
    } else {
      statsCounter.activeCount++;
    }

    if (isProjectCompleted && sameMonth(new Date(project.updatedAt), currentDate)) {
      statsCounter.deliveredThisMonthCount++;
    }

    if (!projectsGroupedByPhase[project.currentPhase]) {
      projectsGroupedByPhase[project.currentPhase] = [];
    }
    projectsGroupedByPhase[project.currentPhase].push(project);
  });

  const phaseBreakdown: PhaseBreakdownItem[] = PHASES_LIST.map((phaseName) => {
    const projectsInPhase = projectsGroupedByPhase[phaseName] || [];
    const phaseProgress = projectsInPhase.length
      ? Math.round(
        projectsInPhase.reduce((sum, proj) => sum + Number(proj.overallProgress), 0) /
        projectsInPhase.length,
      )
      : 0;

    return {
      phase: phaseName,
      progress: phaseProgress,
      count: projectsInPhase.length,
      projects: projectsInPhase,
      status: projectsInPhase.length
        ? phaseProgress === 100
          ? PROJECT_STATUS.COMPLETED
          : PROJECT_STATUS.IN_PROGRESS
        : PROJECT_STATUS.PENDING,
    };
  });

  return { dashboardStats: statsCounter, phaseBreakdown };
}
