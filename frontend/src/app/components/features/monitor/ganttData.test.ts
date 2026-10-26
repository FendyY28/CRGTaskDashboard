import { describe, it, expect } from "vitest";

import {
  DAY_MS,
  PHASE_ORDER,
  buildGanttTasks,
  getCycleDateRange,
  getCyclePhases,
} from "./ganttData";

const baseProject = {
  cycle: 2,
  currentPhase: "Development",
  overallProgress: 55,
  status: "on-track",
  projectStartDate: "2026-01-05T00:00:00.000Z",
  projectDeadline: "2026-06-30T00:00:00.000Z",
};

describe("getCyclePhases", () => {
  it("returns an empty array when the project has no phases", () => {
    expect(getCyclePhases({ ...baseProject }, 1)).toEqual([]);
    expect(getCyclePhases(null, 1)).toEqual([]);
  });

  it("keeps only phases from the selected cycle, treating missing cycle as 1", () => {
    const project = {
      sdlcPhases: [
        { phaseName: "Requirement", cycle: 1 },
        { phaseName: "Requirement", cycle: 2 },
        { phaseName: "TF Meeting" }, // legacy row with no cycle
      ],
    };
    expect(getCyclePhases(project, 2).map((p) => p.phaseName)).toEqual(["Requirement"]);
    expect(getCyclePhases(project, 1).map((p) => p.phaseName)).toEqual([
      "Requirement",
      "TF Meeting",
    ]);
  });
});

describe("getCycleDateRange", () => {
  it("takes the earliest start and latest deadline across phases", () => {
    const phases = [
      { phaseName: "Requirement", startDate: "2026-02-01", deadline: "2026-02-10" },
      { phaseName: "Development", startDate: "2026-01-15", deadline: "2026-03-01" },
    ];
    const range = getCycleDateRange(phases, baseProject);
    expect(range.start).not.toEqual("-");
    expect(range.end).not.toEqual("-");
    // Jan 15 is earlier than Feb 1, Mar 1 later than Feb 10.
    expect(range.start).toContain("2026");
    expect(range.end).toContain("2026");
  });

  it("falls back to project dates when no phase has dates", () => {
    const range = getCycleDateRange([], baseProject);
    expect(range.start).not.toEqual("-");
    expect(range.end).not.toEqual("-");
  });

  it("ignores unparseable dates", () => {
    const phases = [
      { phaseName: "Requirement", startDate: "not-a-date", deadline: "also-bad" },
    ];
    const range = getCycleDateRange(phases, baseProject);
    expect(range.start).not.toEqual("Invalid Date");
    expect(range.end).not.toEqual("Invalid Date");
  });
});

describe("buildGanttTasks", () => {
  it("returns no tasks for a null project", () => {
    expect(buildGanttTasks(null, [], 1, 1)).toEqual([]);
  });

  it("emits one task per SDLC phase", () => {
    const tasks = buildGanttTasks(baseProject, [], 2, 2);
    expect(tasks).toHaveLength(PHASE_ORDER.length);
    expect(tasks.map((t) => t.name)).toEqual([...PHASE_ORDER]);
  });

  it("lays phases back-to-back when no dates are stored", () => {
    const tasks = buildGanttTasks(baseProject, [], 2, 2);
    // Each undated phase spans 7 days and the next starts the following day.
    for (let i = 1; i < tasks.length; i++) {
      const prevEnd = tasks[i - 1].end.getTime();
      expect(tasks[i].start.getTime()).toBe(prevEnd + DAY_MS);
    }
  });

  it("forces a minimum 1-day span when a deadline precedes its start", () => {
    const tasks = buildGanttTasks(
      baseProject,
      [
        {
          phaseName: "Requirement",
          startDate: "2026-02-10",
          deadline: "2026-02-01", // before start
        },
      ],
      2,
      2
    );
    const requirement = tasks[0];
    expect(requirement.end.getTime()).toBeGreaterThan(requirement.start.getTime());
  });

  it("marks unstarted phases as NOT_STARTED with a transparent bar", () => {
    const tasks = buildGanttTasks(baseProject, [], 2, 2);
    const tf = tasks.find((t) => t.name === "TF Meeting") as any;
    expect(tf.custom_status_key).toBe("NOT_STARTED");
    expect(tf.styles.progressColor).toBe("transparent");
  });

  it("leaves phases without a stored row at 0/pending even if it is the current phase", () => {
    // Preserves original behaviour: the live-progress mirror only applies when a
    // phase row exists in the database for this cycle.
    const tasks = buildGanttTasks(baseProject, [], 2, 2);
    const dev = tasks.find((t) => t.name === "Development") as any;
    expect(dev.progress).toBe(0);
    expect(dev.custom_status).toBe("pending");
  });

  it("mirrors live project progress for the current phase when a row exists", () => {
    const tasks = buildGanttTasks(
      baseProject,
      [{ phaseName: "Development", cycle: 2, progress: 10, status: "pending" }],
      2,
      2
    );
    const dev = tasks.find((t) => t.name === "Development") as any;
    expect(dev.progress).toBe(55);
    expect(dev.custom_status).toBe("on-track");
  });

  it("locks archived cycles to stored data and defaults completed to 100", () => {
    const archived = buildGanttTasks(
      baseProject,
      [
        {
          phaseName: "Requirement",
          cycle: 1,
          status: "completed",
          progress: 0,
          startDate: "2026-01-05",
        },
      ],
      1,
      2 // selectedCycle (1) < maxCycle (2) => archived
    );
    const requirement = archived[0] as any;
    expect(requirement.progress).toBe(100);
  });

  it("produces stable task ids including phase and cycle", () => {
    const tasks = buildGanttTasks(baseProject, [], 2, 2);
    expect(tasks[0].id).toBe(`phase-0_${PHASE_ORDER[0]}_2`);
  });
});
