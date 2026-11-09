import { useState, useCallback, useEffect } from "react";
import { api } from "../services/api";
import type { Project, ProjectIssue, ImprovementNote } from "../types";

export const usePIR = () => {
  const [liveProjects, setLiveProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [improvements, setImprovements] = useState<ImprovementNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [prj, iss] = await Promise.all([
        api.get('/project', { signal }),
        api.get('/project/issue', { signal })
      ]);

      // Tampilkan semua project, tanpa terikat fase SDLC tertentu.
      const allProjects = Array.isArray(prj) ? (prj as Project[]) : [];
      
      // Improvements arrive nested in their project; issues arrive flat and
      // without a project name, but both views need it to group and label.
      const projectNameById = new Map(allProjects.map((p) => [String(p.id), p.name]));
      const projectNameFor = (projectId?: string) =>
        projectId ? projectNameById.get(String(projectId)) : undefined;

      const imps: ImprovementNote[] = allProjects.flatMap((p) =>
        (p.improvements || []).map((imp) => ({
          ...imp,
          projectName: p.name,
          type: 'improvement' as const,
        })),
      );

      setLiveProjects(allProjects);
      setIssues(
        Array.isArray(iss)
          ? (iss as (ProjectIssue & { projectId?: string })[]).map((i) => ({
              ...i,
              type: 'issue' as const,
              projectName: projectNameFor(i.projectId),
            }))
          : [],
      );
      setImprovements(imps);
    } catch (e) {
      console.error("PIR Load Failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

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
    liveProjects, issues, improvements, loading,
    refresh: fetchData,
    addIssue, updateIssueStatus, deleteIssue, addImprovement, deleteImprovement
  };
};