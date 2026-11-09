import { useState, useCallback } from "react";
import { api } from "../services/api";
import type { Project, TestCase } from "../types";

export const useTestCases = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);

  // Ambil list project untuk halaman Testing (SIT / UAT).
  // Semua project ditampilkan di setiap halaman, apa pun fase-nya, supaya
  // testing bisa dijalankan kapan saja tanpa menunggu project masuk fase itu.
  const fetchUatProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Project[]>('/project/testing-status');
      const allProjects = Array.isArray(data) ? data : [];
      setProjects(allProjects);
      return allProjects;
    } catch (err) {
      console.error("Gagal load testing projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ambil test cases untuk project spesifik
  const fetchTestCases = useCallback(async (projectId: string) => {
    try {
      const data = await api.get<TestCase[]>(`/project/${projectId}/test-cases`);
      setTestCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gagal load test cases:", err);
    }
  }, []);

  const addTestCase = async (payload: { projectId: string } & Partial<TestCase>) => {
    await api.post(`/project/test-cases`, payload);
    await fetchTestCases(payload.projectId);
  };

  const updateTestCase = async (id: number, payload: Partial<TestCase> & Record<string, unknown>, projectId: string) => {
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