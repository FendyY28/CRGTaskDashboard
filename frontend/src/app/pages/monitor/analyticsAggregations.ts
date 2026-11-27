import { PHASE_LABELS } from "../../constants/projectConstants";
import type { Project, ProjectIssue, TestCase } from "../../types";
import { normalizeStr } from "../../utils/pir";

/**
 * Pure aggregations behind the analytics charts.
 *
 * Each function takes data and returns chart-ready rows — no React, no fetch —
 * so the numbers can be unit tested directly. The hook only memoises them and
 * wires the translations in.
 */

/** Colours reused by several charts (kept here so the numbers and legends agree). */
export const CHART_COLORS = {
  danger: "#E11D48",
  info: "#0284C7",
  muted: "#9CA3AF",
  pass: "#059669",
  fail: "#E11D48",
} as const;

/** Labels the charts need, already translated by the caller. */
export interface ChartLabels {
  open: string;
  inProgress: string;
  resolved: string;
  takeout: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
  projects: string;
}

/** One slice of a pie/donut chart. */
export interface CategoricalDatum {
  name: string;
  value: number;
  color: string;
}

/** One bar group of the "live issues by priority" chart. */
export type PriorityDatum = { name: string } & Record<string, number | string>;

/** Average progress per SDLC phase, plus how many projects sit in it. */
export interface PhaseProgressDatum {
  name: string;
  Average: number;
  projectCount: number;
}

const HEALTH_COLORS = {
  onTrack: "#00A39D",
  atRisk: "#F59E0B",
  overdue: CHART_COLORS.danger,
  completed: "#059669",
} as const;

/** Project health breakdown (only non-empty buckets are returned). */
export function buildStatusData(projects: Project[], labels: { tr: string; ar: string; ov: string; co: string }): CategoricalDatum[] {
  const counts = { 'on-track': 0, 'at-risk': 0, overdue: 0, completed: 0 };
  for (const project of projects) {
    if (project.status in counts) counts[project.status as keyof typeof counts]++;
  }
  return [
    { name: labels.tr, value: counts['on-track'], color: HEALTH_COLORS.onTrack },
    { name: labels.ar, value: counts['at-risk'], color: HEALTH_COLORS.atRisk },
    { name: labels.ov, value: counts.overdue, color: HEALTH_COLORS.overdue },
    { name: labels.co, value: counts.completed, color: HEALTH_COLORS.completed },
  ].filter((d) => d.value > 0);
}

/** Mean progress of the projects currently sitting in each master phase. */
export function buildAverageProgressData(projects: Project[]): PhaseProgressDatum[] {
  return PHASE_LABELS.map(({ short, full }) => {
    const inPhase = projects.filter((p) => p.currentPhase === full);
    const average =
      inPhase.length > 0
        ? Math.round(inPhase.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / inPhase.length)
        : 0;
    return { name: short, Average: average, projectCount: inPhase.length };
  });
}

/** Number of projects per phase, keyed by the translated series label. */
export function buildPhaseData(projects: Project[], projectLabel: string) {
  return PHASE_LABELS.map(({ short, full }) => ({
    name: short,
    [projectLabel]: projects.filter((p) => p.currentPhase === full).length,
  }));
}

/** UAT outcome breakdown across the given test cases. */
export function buildUatData(testCases: TestCase[], takeoutLabel: string): CategoricalDatum[] {
  const counts = { pass: 0, fail: 0, pending: 0, takeout: 0 };
  for (const testCase of testCases) {
    if (testCase.isDeleted) counts.takeout++;
    else if (testCase.status === 'pass') counts.pass++;
    else if (testCase.status === 'fail') counts.fail++;
    else counts.pending++;
  }
  return [
    { name: 'Passed', value: counts.pass, color: CHART_COLORS.pass },
    { name: 'Failed', value: counts.fail, color: CHART_COLORS.fail },
    { name: 'Pending', value: counts.pending, color: '#F59E0B' },
    { name: takeoutLabel, value: counts.takeout, color: CHART_COLORS.muted },
  ].filter((d) => d.value > 0);
}

/** Open / in-progress issue counts per priority (resolved issues are excluded). */
export function buildIssueData(issues: ProjectIssue[], labels: ChartLabels): PriorityDatum[] {
  const byPriority: Record<string, PriorityDatum> = {
    critical: { name: labels.critical, [labels.open]: 0, [labels.inProgress]: 0 },
    high: { name: labels.high, [labels.open]: 0, [labels.inProgress]: 0 },
    medium: { name: labels.medium, [labels.open]: 0, [labels.inProgress]: 0 },
    low: { name: labels.low, [labels.open]: 0, [labels.inProgress]: 0 },
  };

  for (const issue of issues) {
    const priority = issue.priority?.toLowerCase();
    const status = normalizeStr(issue.status);
    const target = priority ? byPriority[priority] : undefined;
    if (!target || status === 'resolved') continue;
    if (status === 'in progress') target[labels.inProgress] = Number(target[labels.inProgress]) + 1;
    else if (status === 'open') target[labels.open] = Number(target[labels.open]) + 1;
  }

  return [byPriority.critical, byPriority.high, byPriority.medium, byPriority.low];
}

/** Issue resolution breakdown (open / in progress / resolved). */
export function buildIssueResolutionData(issues: ProjectIssue[], labels: ChartLabels): CategoricalDatum[] {
  const counts = { open: 0, 'in progress': 0, resolved: 0 };
  for (const issue of issues) {
    const status = normalizeStr(issue.status);
    if (status === 'open') counts.open++;
    else if (status === 'in progress') counts['in progress']++;
    else if (status === 'resolved') counts.resolved++;
  }
  return [
    { name: labels.resolved, value: counts.resolved, color: '#059669' },
    { name: labels.inProgress, value: counts['in progress'], color: CHART_COLORS.info },
    { name: labels.open, value: counts.open, color: CHART_COLORS.danger },
  ].filter((d) => d.value > 0);
}

/** Top 5 projects by number of failed (non-taken-out) test cases. */
export function buildTopDefectsData(
  testCases: TestCase[],
  allProjects: Project[],
): { name: string; Fails: number }[] {
  const failsByProject = new Map<string, number>();
  for (const testCase of testCases) {
    if (testCase.isDeleted || testCase.status !== 'fail') continue;
    const projectId = testCase.projectId || 'Unknown';
    failsByProject.set(projectId, (failsByProject.get(projectId) ?? 0) + 1);
  }

  return [...failsByProject.entries()]
    .map(([projectId, fails]) => {
      const project = allProjects.find((p) => String(p.id) === String(projectId));
      const projectName = project ? project.name : `PRJ-${projectId}`;
      const shortName = projectName.length > 15 ? `${projectName.substring(0, 15)}...` : projectName;
      return { name: shortName, Fails: fails };
    })
    .sort((a, b) => b.Fails - a.Fails)
    .slice(0, 5);
}
