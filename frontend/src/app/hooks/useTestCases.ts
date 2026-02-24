import { useState, useCallback } from "react";
import { api } from "../services/api";

export const useTestCases = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Ambil list project yang sedang tahap UAT
  const fetchUatProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/project/testing-status');
      setProjects(data);
      return data;
    } catch (err) {
      console.error("Gagal load UAT projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ambil test cases untuk project spesifik
  const fetchTestCases = useCallback(async (projectId: string) => {
    try {
      const data = await api.get(`/project/${projectId}/test-cases`);
      setTestCases(data);
    } catch (err) {
      console.error("Gagal load test cases:", err);
    }
  }, []);

  const addTestCase = async (payload: any) => {
    await api.post(`/project/test-cases`, payload);
    await fetchTestCases(payload.projectId);
  };

  const updateTestCase = async (id: number, payload: any, projectId: string) => {
    await api.patch(`/project/test-cases/${id}`, payload);
    await fetchTestCases(projectId);
  };

  const deleteTestCase = async (id: number, projectId: string) => {
    await api.delete(`/project/test-cases/${id}`);
    await fetchTestCases(projectId);
  };

  return {
    projects,
    testCases,
    loading,
    fetchUatProjects,
    fetchTestCases,
    addTestCase,
    updateTestCase,
    deleteTestCase
  };
};