import { useCallback } from "react";
import { api } from "../services/api";
import type { Project } from "../types";
import { useApiResource } from "./useApiResource";

const asProjectList = (raw: unknown): Project[] => (Array.isArray(raw) ? (raw as Project[]) : []);

export const useProjects = () => {
  const { data: projects, loading, error, reload } = useApiResource<Project[]>(
    "/project",
    [],
    "Gagal mengambil data proyek.",
    asProjectList,
  );

  const fetchProjects = useCallback((signal?: AbortSignal) => reload(signal), [reload]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await api.delete(`/project/${id}`);
      await fetchProjects();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Gagal menghapus proyek.",
      };
    }
  }, [fetchProjects]);

  return { projects, loading, error, refresh: fetchProjects, deleteProject };
};