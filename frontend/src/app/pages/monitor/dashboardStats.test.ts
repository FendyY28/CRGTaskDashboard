import { describe, it, expect } from "vitest";

import { computeDashboardStats } from "./dashboardStats";
import { SDLC_PHASES, PROJECT_STATUS } from "../../constants/projectConstants";
import type { Project } from "../../types";

const NOW = new Date("2026-06-15T10:00:00.000Z");

const project = (overrides: Partial<Project>): Project =>
  ({
    id: "PRJ-001",
    name: "P",
    pic: "PIC",
    currentPhase: SDLC_PHASES.REQUIREMENT,
    status: PROJECT_STATUS.ON_TRACK,
    overallProgress: 0,
    cycle: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    projectStartDate: "2026-01-01T00:00:00.000Z",
    projectDeadline: "2026-12-31T00:00:00.000Z",
    ...overrides,
  }) as Project;

describe("computeDashboardStats", () => {
  it("returns zeroed stats and one pending row per phase for an empty list", () => {
    const { dashboardStats, phaseBreakdown } = computeDashboardStats([], NOW);

    expect(dashboardStats).toEqual({
      totalCount: 0,
      activeCount: 0,
      completedCount: 0,
      newThisMonthCount: 0,
      deliveredThisMonthCount: 0,
    });
    expect(phaseBreakdown).toHaveLength(Object.values(SDLC_PHASES).length);
    expect(phaseBreakdown.every((p) => p.status === PROJECT_STATUS.PENDING && p.count === 0)).toBe(true);
  });

  it("classifies a Live project at 100% as completed and the rest as active", () => {
    const { dashboardStats } = computeDashboardStats(
      [
        project({ id: "PRJ-001", currentPhase: SDLC_PHASES.LIVE, overallProgress: 100 }),
        project({ id: "PRJ-002", currentPhase: SDLC_PHASES.LIVE, overallProgress: 90 }),
        project({ id: "PRJ-003", currentPhase: SDLC_PHASES.SIT, overallProgress: 40 }),
      ],
      NOW,
    );

    expect(dashboardStats.totalCount).toBe(3);
    expect(dashboardStats.completedCount).toBe(1);
    expect(dashboardStats.activeCount).toBe(2);
  });

  it("counts projects created and delivered in the current month", () => {
    const { dashboardStats } = computeDashboardStats(
      [
        project({ id: "PRJ-001", currentPhase: SDLC_PHASES.LIVE, overallProgress: 100, updatedAt: "2026-06-02T00:00:00.000Z" }),
        project({ id: "PRJ-002", createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z" }),
        project({ id: "PRJ-003", createdAt: "2025-06-20T00:00:00.000Z", updatedAt: "2025-06-20T00:00:00.000Z" }),
      ],
      NOW,
    );

    expect(dashboardStats.newThisMonthCount).toBe(1);
    expect(dashboardStats.deliveredThisMonthCount).toBe(1);
  });

  it("groups projects per phase and averages their progress", () => {
    const { phaseBreakdown } = computeDashboardStats(
      [
        project({ id: "PRJ-001", currentPhase: SDLC_PHASES.DEVELOPMENT, overallProgress: 50 }),
        project({ id: "PRJ-002", currentPhase: SDLC_PHASES.DEVELOPMENT, overallProgress: 100 }),
        project({ id: "PRJ-003", currentPhase: SDLC_PHASES.SIT, overallProgress: 100 }),
      ],
      NOW,
    );

    const dev = phaseBreakdown.find((p) => p.phase === SDLC_PHASES.DEVELOPMENT)!;
    expect(dev.count).toBe(2);
    expect(dev.progress).toBe(75);
    expect(dev.status).toBe(PROJECT_STATUS.IN_PROGRESS);
    expect(dev.projects.map((p) => p.id)).toEqual(["PRJ-001", "PRJ-002"]);

    const sit = phaseBreakdown.find((p) => p.phase === SDLC_PHASES.SIT)!;
    expect(sit.status).toBe(PROJECT_STATUS.COMPLETED);
  });
});
