import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { Project } from "../types";

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data: Project[] = await api.get('/project', { signal });
      setProjects(Array.isArray(data) ? data : []);
      setError(null);
      setLoading(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // A stale/unmounted request: leave `loading` to whichever request replaced it.
        return;
      }
      const message = err instanceof Error ? err.message : undefined;
      setError(message || "Gagal mengambil data proyek.");
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  return { projects, loading, error, refresh: fetchProjects, deleteProject };
};