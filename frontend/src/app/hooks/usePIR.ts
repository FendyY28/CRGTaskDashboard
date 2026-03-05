import { useState, useCallback, useEffect } from "react";
import { api } from "../services/api";
import { SDLC_PHASES } from "../constants/projectConstants";
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

      // Filter Proyek LIVE
      const live = Array.isArray(prj) ? prj.filter((p: Project) => p.currentPhase === SDLC_PHASES.LIVE) : [];
      
      // Gabungkan Improvement dari proyek-proyek live
      const imps = live.flatMap((p: Project) => (p.improvements || []).map((imp) => ({ 
        ...imp, projectName: p.name, type: 'improvement' 
      })));

      setLiveProjects(live);
      setIssues(Array.isArray(iss) ? iss.map((i: any) => ({ ...i, type: 'issue' })) : []);
      setImprovements(imps as any);
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

  const addIssue = async (data: any) => {
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

  const addImprovement = async (data: any) => {
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