import { api } from "../services/api";
import type { Project, ProjectIssue, ImprovementNote } from "../types";
import { useApiResource } from "./useApiResource";

interface PirData {
  liveProjects: Project[];
  issues: (ProjectIssue & { type: 'issue' } & { projectName?: string })[];
  improvements: ImprovementNote[];
}

const EMPTY_PIR_DATA: PirData = { liveProjects: [], issues: [], improvements: [] };

/** Reshape the raw project + issue responses into the PIR view model. */
const buildPirData = (raw: unknown): PirData => {
  const [prj, iss] = (Array.isArray(raw) ? raw : []) as [unknown, unknown];

  // Tampilkan semua project, tanpa terikat fase SDLC tertentu.
  const allProjects = Array.isArray(prj) ? (prj as Project[]) : [];

  // Improvements arrive nested in their project; issues arrive flat and
  // without a project name, but both views need it to group and label.
  const projectNameById = new Map(allProjects.map((p) => [String(p.id), p.name]));
  const projectNameFor = (projectId?: string) =>
    projectId ? projectNameById.get(String(projectId)) : undefined;

  const improvements: ImprovementNote[] = allProjects.flatMap((p) =>
    (p.improvements || []).map((imp) => ({
      ...imp,
      projectName: p.name,
      type: 'improvement' as const,
    })),
  );

  return {
    liveProjects: allProjects,
    issues: Array.isArray(iss)
      ? (iss as (ProjectIssue & { projectId?: string })[]).map((i) => ({
          ...i,
          type: 'issue' as const,
          projectName: projectNameFor(i.projectId),
        }))
      : [],
    improvements,
  };
};

export const usePIR = () => {
  // Both responses arrive together: [projects, issues].
  const { data, loading, reload } = useApiResource<PirData>(
    ['/project', '/project/issue'],
    EMPTY_PIR_DATA,
    "PIR Load Failed",
    buildPirData,
  );

  const fetchData = reload;

  const addIssue = async (data: ProjectIssue) => {
    await api.post('/project/issue', data);
    await fetchData();
  };

  const updateIssueStatus = async (id: number, status: string) => {
    await api.patch(`/project/issue/${id}`, { status });
    await fetchData();
  };

  const deleteIssue = async (id: number) => {
    await api.delete(`/project/issue/${id}`);
    await fetchData();
  };

  const addImprovement = async (data: ImprovementNote) => {
    await api.post('/project/improvement', data);
    await fetchData();
  };
  const deleteImprovement = async (id: number) => {
    await api.delete(`/project/improvement/${id}`);
    await fetchData();
  };
  

  return {
    liveProjects: data.liveProjects,
    issues: data.issues,
    improvements: data.improvements,
    loading,
    refresh: fetchData,
    addIssue, updateIssueStatus, deleteIssue, addImprovement, deleteImprovement
  };
};