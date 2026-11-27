import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import type { Project, ProjectIssue, TestCase } from "../types";
import { useApiResource } from "./useApiResource";
import {
  buildAverageProgressData,
  buildIssueData,
  buildIssueResolutionData,
  buildPhaseData,
  buildStatusData,
  buildTopDefectsData,
  buildUatData,
  type ChartLabels,
} from "../pages/monitor/analyticsAggregations";

interface AnalyticsData {
  projects: Project[];
  issues: ProjectIssue[];
  testCases: TestCase[];
}

const asList = <T>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);

/**
 * Fetch everything the analytics page charts: projects + issues, plus the test
 * cases of the UAT projects (test cases live per project, so they need the
 * project list first). Abort/loading/"latest request wins" handling is shared
 * with the other data hooks through useApiResource.
 */
const fetchAnalyticsData = async (signal?: AbortSignal): Promise<AnalyticsData> => {
  const [projectsRes, issuesRes] = await Promise.all([
    api.get<Project[]>('/project', { signal }),
    api.get<ProjectIssue[]>('/project/issue', { signal }),
  ]);

  const projects = asList<Project>(projectsRes);
  const uatProjects = projects.filter((p) => p.currentPhase === 'UAT');
  const testCases = (
    await Promise.all(
      uatProjects.map((p) => api.get<TestCase[]>(`/project/${p.id}/test-cases`, { signal })),
    )
  ).flatMap((tc) => asList<TestCase>(tc));

  return { projects, issues: asList<ProjectIssue>(issuesRes), testCases };
};

const EMPTY_ANALYTICS_DATA: AnalyticsData = { projects: [], issues: [], testCases: [] };

export function useAnalyticsData(selectedProjectIds: string[] = []) {
  const { t } = useTranslation();

  const labels: ChartLabels = useMemo(
    () => ({
      open: t('pir.tabs.open') || 'Open',
      inProgress: t('pir.tabs.in-progress') || 'In Progress',
      resolved: t('pir.tabs.resolved') || 'Resolved',
      takeout: t('testing.row.takenOut') || 'Takeout',
      critical: t('pir.priorities.critical'),
      high: t('pir.priorities.high'),
      medium: t('pir.priorities.medium'),
      low: t('pir.priorities.low'),
      projects: t('analytics.labels.projects'),
    }),
    [t],
  );

  // Fetch everything once on mount; the filter below is applied client-side.
  const { data } = useApiResource<AnalyticsData>(
    '/project',
    EMPTY_ANALYTICS_DATA,
    "Failed to fetch analytics data",
    undefined,
    fetchAnalyticsData,
  );
  const { projects: allProjects, issues: allIssues, testCases: allTestCases } = data;

  const { projects, issues, testCases } = useMemo(() => {
    // No filter selected -> the whole dataset.
    if (selectedProjectIds.length === 0) {
      return { projects: allProjects, issues: allIssues, testCases: allTestCases };
    }
    const isSelected = (projectId?: string) =>
      !!projectId && selectedProjectIds.includes(projectId);
    return {
      projects: allProjects.filter((p) => selectedProjectIds.includes(p.id)),
      issues: allIssues.filter((i) => isSelected(i.projectId)),
      testCases: allTestCases.filter((tc) => isSelected(tc.projectId)),
    };
  }, [allProjects, allIssues, allTestCases, selectedProjectIds]);

  // Chart rows are pure functions of the filtered data (see analyticsAggregations).
  const statusData = useMemo(
    () =>
      buildStatusData(projects, {
        tr: 'On Track',
        ar: 'At Risk',
        ov: 'Overdue',
        co: 'Completed',
      }),
    [projects],
  );
  const averageProgressData = useMemo(() => buildAverageProgressData(projects), [projects]);
  const phaseData = useMemo(() => buildPhaseData(projects, labels.projects), [projects, labels.projects]);
  const uatData = useMemo(() => buildUatData(testCases, labels.takeout), [testCases, labels.takeout]);
  const issueData = useMemo(() => buildIssueData(issues, labels), [issues, labels]);
  const issueResolutionData = useMemo(
    () => buildIssueResolutionData(issues, labels),
    [issues, labels],
  );
  const topDefectsData = useMemo(
    () => buildTopDefectsData(testCases, allProjects),
    [testCases, allProjects],
  );

  return {
    availableProjects: allProjects.map((p) => ({ id: p.id, name: p.name })),
    statusData,
    averageProgressData,
    phaseData,
    uatData,
    issueData,
    issueResolutionData,
    openLbl: labels.open,
    inProgressLbl: labels.inProgress,
    topDefectsData,
  };
}
