import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { Project, TestCase } from "../types";
import { useApiResource } from "./useApiResource";

const asProjectList = (raw: unknown): Project[] => (Array.isArray(raw) ? (raw as Project[]) : []);

// Ambil list project untuk halaman Testing (SIT / UAT).
// Semua project ditampilkan di setiap halaman, apa pun fase-nya, supaya
// testing bisa dijalankan kapan saja tanpa menunggu project masuk fase itu.

/** Project list for the SIT/UAT consoles plus the test-case mutations. */
export const useTestCases = () => {
  const { data: projects, loading, reload } = useApiResource<Project[]>(
    "/project/testing-status",
    [],
    "Gagal load testing projects:",
    asProjectList,
  );
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  // Mirrors `projects` so a fetch can hand back the list it just loaded rather
  // than the value captured by the render that created the callback.
  const latestDataRef = useRef<Project[]>(projects);
  useEffect(() => {
    latestDataRef.current = projects;
  }, [projects]);

  // `reload` resolves after the latest response is already committed, so return
  // that list instead of the `projects` captured by this render (which is the
  // previous, stale list right after a fetch). Failures are swallowed because
  // the hook already exposes them through `error`.
  const fetchUatProjects = useCallback(async () => {
    try {
      await reload();
    } catch {
      // Already surfaced via `error`.
    }
    return latestDataRef.current;
  }, [reload]);

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