import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import type { Project } from "../types"; // 🚀 Import interface kamu

export const useProjects = () => {
  // Ganti any[] jadi Project[]
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      // TypeScript sekarang tahu 'data' adalah array dari Project
      const data: Project[] = await api.get('/project', { signal });
      setProjects(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || "Gagal mengambil data proyek.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await api.delete(`/project/${id}`);
      await fetchProjects();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [fetchProjects]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  return { projects, loading, error, refresh: fetchProjects, deleteProject };
};