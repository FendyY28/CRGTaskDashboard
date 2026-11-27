import { describe, it, expect } from "vitest";

import {
  buildAverageProgressData,
  buildIssueData,
  buildIssueResolutionData,
  buildStatusData,
  buildTopDefectsData,
  buildUatData,
  type ChartLabels,
} from "./analyticsAggregations";
import { SDLC_PHASES, PROJECT_STATUS } from "../../constants/projectConstants";
import type { Project, ProjectIssue, TestCase } from "../../types";

const project = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "PRJ-001",
    name: "Project One",
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

const issue = (overrides: Partial<ProjectIssue> = {}): ProjectIssue =>
  ({
    issueId: "ISS-001",
    priority: "high",
    description: "d",
    impactArea: "General",
    reportedBy: "System",
    reportedDate: "2026-01-01T00:00:00.000Z",
    status: "open",
    type: "issue",
    ...overrides,
  }) as ProjectIssue;

const testCase = (overrides: Partial<TestCase> = {}): TestCase =>
  ({ id: "tc-1", projectId: "PRJ-001", ...overrides }) as TestCase;

const labels: ChartLabels = {
  open: "Open",
  inProgress: "In Progress",
  resolved: "Resolved",
  takeout: "Takeout",
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  projects: "Projects",
};

const statusLabels = { tr: "On Track", ar: "At Risk", ov: "Overdue", co: "Completed" };

describe("analytics aggregations", () => {
  it("counts project health and drops empty buckets", () => {
    const data = buildStatusData(
      [
        project({ id: "1", status: PROJECT_STATUS.ON_TRACK }),
        project({ id: "2", status: PROJECT_STATUS.ON_TRACK }),
        project({ id: "3", status: PROJECT_STATUS.AT_RISK }),
      ],
      statusLabels,
    );

    expect(data).toEqual([
      { name: "On Track", value: 2, color: "#00A39D" },
      { name: "At Risk", value: 1, color: "#F59E0B" },
    ]);
  });

  it("averages progress per phase and reports the project count", () => {
    const data = buildAverageProgressData([
      project({ id: "1", currentPhase: SDLC_PHASES.SIT, overallProgress: 40 }),
      project({ id: "2", currentPhase: SDLC_PHASES.SIT, overallProgress: 61 }),
      project({ id: "3", currentPhase: SDLC_PHASES.UAT, overallProgress: 10 }),
    ]);

    const sit = data.find((d) => d.Average === 51);
    expect(sit).toBeDefined();
    expect(sit?.projectCount).toBe(2);
    // Every master phase gets a row, even when empty.
    expect(data).toHaveLength(6);
  });

  it("splits UAT results, counting taken-out cases separately", () => {
    const data = buildUatData(
      [
        testCase({ status: "pass" }),
        testCase({ status: "fail" }),
        testCase({ status: "pending" }),
        testCase({ status: "fail", isDeleted: true }),
      ],
      "Takeout",
    );

    expect(Object.fromEntries(data.map((d) => [d.name, d.value]))).toEqual({
      Passed: 1,
      Failed: 1,
      Pending: 1,
      Takeout: 1,
    });
  });

  it("counts open and in-progress issues per priority, excluding resolved", () => {
    const data = buildIssueData(
      [
        issue({ priority: "high", status: "open" }),
        issue({ priority: "high", status: "in-progress" }),
        issue({ priority: "high", status: "resolved" }),
        issue({ priority: "low", status: "open" }),
      ],
      labels,
    );

    const high = data.find((d) => d.name === "High");
    expect(high).toMatchObject({ Open: 1, "In Progress": 1 });
    const low = data.find((d) => d.name === "Low");
    expect(low).toMatchObject({ Open: 1, "In Progress": 0 });
  });

  it("breaks issue resolution down into the three states", () => {
    const data = buildIssueResolutionData(
      [
        issue({ status: "open" }),
        issue({ status: "in-progress" }),
        issue({ status: "resolved" }),
        issue({ status: "resolved" }),
      ],
      labels,
    );

    expect(Object.fromEntries(data.map((d) => [d.name, d.value]))).toEqual({
      Open: 1,
      "In Progress": 1,
      Resolved: 2,
    });
  });

  it("ranks only failing, non-removed test cases and caps the list at five", () => {
    const projects = Array.from({ length: 6 }, (_, i) =>
      project({ id: `PRJ-00${i + 1}`, name: `Project ${i + 1}` }),
    );
    const cases = [
      ...Array.from({ length: 3 }, () => testCase({ projectId: "PRJ-001", status: "fail" })),
      testCase({ projectId: "PRJ-002", status: "fail" }),
      testCase({ projectId: "PRJ-003", status: "pass" }),
      testCase({ projectId: "PRJ-004", status: "fail", isDeleted: true }),
    ];

    const data = buildTopDefectsData(cases, projects);

    expect(data[0]).toEqual({ name: "Project 1", Fails: 3 });
    expect(data).toHaveLength(2);
    expect(data.some((d) => d.name === "Project 3")).toBe(false);
  });
});
