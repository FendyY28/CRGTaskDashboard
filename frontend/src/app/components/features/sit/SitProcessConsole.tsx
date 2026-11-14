import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import {
  GitBranch,
  Workflow,
  Plus,
  Trash2,
  Lock,
  CircleCheck,
  Circle,
  RotateCcw,
  X,
  Layers,
  Clock,
} from "lucide-react";
import { Button } from "../../ui/button";
import { useTestCases } from "../../../hooks/useTestCases";
import { ProjectSidebar } from "../../layouts/ProjectSidebar";
import { ProtectAction } from "../../auth/ProtectAction";
import { api } from "../../../services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

/**
 * SIT accent — deliberately different from the UAT console's teal/amber.
 * SIT is rendered in indigo so the two testing pages are distinguishable
 * at a glance, while cards and headers stay on the standard white UI.
 */
const SIT_ACCENT = "#4F46E5";

/**
 * Fixed standard SIT processes. Every project goes through these in order —
 * they cannot be removed, only marked done / failed / pending. `id` doubles
 * as the locale key (sit.page.fixed.<id>).
 */
const FIXED_SIT_PROCESSES = [
  { id: "envSetup", order: 0 },
  { id: "dataMigration", order: 1 },
  { id: "integrationCheck", order: 2 },
  { id: "endToEnd", order: 3 },
  { id: "regression", order: 4 },
  { id: "signOff", order: 5 },
] as const;

type ProcessStatus = "pending" | "done" | "failed";

/** Row shape returned by GET /project/:id/sit-processes. */
interface SitProcessRecord {
  id: string;
  key: string | null;
  name: string;
  status: ProcessStatus;
  order: number;
  createdBy: string;
  updatedBy?: string | null;
}

/** Display row: fixed steps resolve their label from the locale. */
interface SitProcess {
  id: string;
  name: string;
  key: string | null;
  status: ProcessStatus;
  order: number;
  dynamic: boolean;
  updatedBy?: string | null;
}

const STATUS_META: Record<
  ProcessStatus,
  { icon: typeof Circle; color: string; bg: string; border: string; labelKey: string }
> = {
  pending: {
    icon: Circle,
    color: "#9CA3AF",
    bg: "bg-white/95",
    border: "border-gray-200",
    labelKey: "status.pending",
  },
  done: {
    icon: CircleCheck,
    color: "#059669",
    bg: "bg-emerald-50/95",
    border: "border-emerald-200",
    labelKey: "status.done",
  },
  failed: {
    icon: X,
    color: "#DC2626",
    bg: "bg-red-50/95",
    border: "border-red-200",
    labelKey: "status.failed",
  },
};

function toDisplay(row: SitProcessRecord): SitProcess {
  const isDynamic = !row.key;
  return {
    id: row.id,
    name: isDynamic ? row.name : row.key!,
    key: row.key,
    status: row.status,
    order: row.order,
    dynamic: isDynamic,
    updatedBy: row.updatedBy,
  };
}

function toPayload(process: SitProcess, order: number) {
  return {
    id: process.id,
    key: process.key,
    name: process.dynamic ? process.name : process.key!,
    status: process.status,
    order,
  };
}

export function SitProcessConsole() {
  const { projects, loading: isLoading, fetchUatProjects } = useTestCases();
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [processes, setProcesses] = useState<SitProcess[]>([]);
  const [isFetchingProcesses, setIsFetchingProcesses] = useState(false);
  const [newProcessName, setNewProcessName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    fetchUatProjects().then((fetched) => {
      if (fetched && fetched.length > 0) setSelectedProject(fetched[0]);
    });
  }, [fetchUatProjects]);

  const fetchProcesses = useCallback(async (projectId: string) => {
    setIsFetchingProcesses(true);
    try {
      const rows = await api.get<SitProcessRecord[]>(`/project/${projectId}/sit-processes`);
      // First load for a project: seed the fixed standard steps server-side.
      if (!Array.isArray(rows) || rows.length === 0) {
        await api.put("/project/sit-processes", {
          projectId,
          processes: FIXED_SIT_PROCESSES.map((p) => ({
            id: `fixed:${p.id}`,
            key: p.id,
            name: p.id,
            status: "pending",
            order: p.order,
          })),
        });
        setProcesses(
          FIXED_SIT_PROCESSES.map((p) => ({
            id: `fixed:${p.id}`,
            name: p.id,
            key: p.id,
            status: "pending" as ProcessStatus,
            order: p.order,
            dynamic: false,
          })),
        );
        return;
      }
      setProcesses(rows.map(toDisplay));
    } catch (err) {
      console.error("Gagal load SIT processes:", err);
      setProcesses([]);
    } finally {
      setIsFetchingProcesses(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) fetchProcesses(selectedProject.id);
    else setProcesses([]);
  }, [selectedProject, fetchProcesses]);

  /**
   * Persist the whole pipeline. The backend diffs against the stored state and
   * writes ONE audit entry ("UPDATE_SIT_PROCESS") listing every status change,
   * so the Audit Trail page records who moved which SIT step and when.
   */
  const persist = useCallback(
    async (next: SitProcess[]) => {
      if (!selectedProject) return;
      const ordered = next.map((p, index) => toPayload(p, index));
      try {
        const rows = await api.put<SitProcessRecord[]>("/project/sit-processes", {
          projectId: selectedProject.id,
          processes: ordered,
        });
        setProcesses((Array.isArray(rows) ? rows : []).map(toDisplay));
      } catch (err) {
        console.error("Gagal menyimpan SIT processes:", err);
        toast.error(t("sit.page.toast.saveFailed"));
      }
    },
    [selectedProject, t],
  );

  const addProcess = useCallback(async () => {
    const name = newProcessName.trim();
    if (!name || !selectedProject) return;
    if (processes.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t("sit.page.toast.duplicate"));
      return;
    }
    try {
      await api.post("/project/sit-processes", {
        projectId: selectedProject.id,
        name,
        status: "pending",
        order: processes.length,
      });
      await fetchProcesses(selectedProject.id);
      setNewProcessName("");
      setIsAdding(false);
      toast.success(t("sit.page.toast.added"));
    } catch (err) {
      console.error("Gagal menambah proses SIT:", err);
      toast.error(t("sit.page.toast.saveFailed"));
    }
  }, [newProcessName, selectedProject, processes, fetchProcesses, t]);

  const removeProcess = useCallback(
    async (processId: string) => {
      if (!selectedProject) return;
      try {
        await api.delete(
          `/project/sit-processes/${encodeURIComponent(processId)}?projectId=${encodeURIComponent(selectedProject.id)}`,
        );
        await fetchProcesses(selectedProject.id);
        toast.success(t("sit.page.toast.removed"));
      } catch (err) {
        console.error("Gagal menghapus proses SIT:", err);
        toast.error(t("sit.page.toast.saveFailed"));
      }
    },
    [selectedProject, fetchProcesses, t],
  );

  const stats = useMemo(() => {
    const done = processes.filter((p) => p.status === "done").length;
    const failed = processes.filter((p) => p.status === "failed").length;
    const pending = processes.length - done - failed;
    return {
      done,
      failed,
      pending,
      progress: processes.length ? Math.round((done / processes.length) * 100) : 0,
    };
  }, [processes]);

  if (isLoading && !projects.length)
    return (
      <div
        className="h-screen flex items-center justify-center font-bold animate-pulse text-lg"
        style={{ color: SIT_ACCENT }}
      >
        {t("sit.page.loading")}
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-left relative">
      <div className="flex flex-col gap-1 mb-8 pb-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2 drop-shadow-xs">
          <GitBranch className="h-6 w-6 text-white" /> {t("sit.page.title")}
        </h2>
        <p className="text-sm text-white/90 font-medium drop-shadow-xs">
          {t("sit.page.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 lg:self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <ProjectSidebar
            title={t("sit.page.sidebarTitle")}
            projects={projects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            emptyStateText={t("sit.page.noProjects")}
          />
        </div>

        <main className="lg:col-span-3 space-y-6">
          {selectedProject ? (
            <>
              {/* Integration pipeline — standard white card, same as the rest of
                  the app's UI; only the accent color differs from UAT. */}
              <Card className="border border-white/60 shadow-xl shadow-indigo-950/5 ring-1 ring-black/5 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="px-5 py-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-500">
                        <Workflow className="h-3.5 w-3.5" style={{ color: SIT_ACCENT }} />{" "}
                        {t("sit.page.pipelineLabel")}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 truncate mt-0.5">
                        {selectedProject.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {(
                        [
                          ["done", stats.done, "#059669"],
                          ["failed", stats.failed, "#DC2626"],
                          ["pending", stats.pending, "#9CA3AF"],
                        ] as const
                      ).map(([key, count, color]) => (
                        <div key={key} className="text-center">
                          <div
                            className="text-xl font-black leading-none"
                            style={{ color }}
                          >
                            {count}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                            {t(`sit.page.${key}`)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {processes.map((p) => (
                      <div
                        key={p.id}
                        className="h-1.5 flex-1 rounded-full transition-all duration-500"
                        style={{
                          backgroundColor:
                            p.status === "done"
                              ? "#A5B4FC"
                              : p.status === "failed"
                                ? "#FDA4AF"
                                : "#E5E7EB",
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-right text-[11px] font-bold mt-1.5 text-gray-400">
                    {stats.progress}% {t("sit.page.completed")}
                  </div>
                </CardContent>
              </Card>

              {/* Process pipeline (vertical stepper) */}
              <Card className="border border-white/60 shadow-xl shadow-indigo-950/5 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="px-0 py-0">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" style={{ color: SIT_ACCENT }} />
                      <h4 className="text-sm font-black uppercase tracking-widest text-gray-800">
                        {t("sit.page.processesTitle")}
                      </h4>
                      <span className="text-[11px] font-bold text-gray-400">
                        {processes.length}
                      </span>
                    </div>
                    <ProtectAction>
                      {isAdding ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={newProcessName}
                            onChange={(e) => setNewProcessName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addProcess();
                              if (e.key === "Escape") setIsAdding(false);
                            }}
                            placeholder={t("sit.page.newProcessPlaceholder")}
                            className="h-8 w-48 sm:w-64 text-sm px-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] focus:bg-white"
                          />
                          <Button
                            size="sm"
                            onClick={addProcess}
                            className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-extrabold gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <button
                            onClick={() => setIsAdding(false)}
                            className="p-1 text-gray-400 hover:text-gray-700"
                            aria-label={t("sit.page.cancel")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAdding(true)}
                          className="h-8 gap-1.5 rounded-lg border-dashed bg-gray-50 text-gray-600 hover:bg-gray-100 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">
                            {t("sit.page.addProcess")}
                          </span>
                        </Button>
                      )}
                    </ProtectAction>
                  </div>

                  <ol className="px-5 py-4 space-y-1">
                    {isFetchingProcesses && (
                      <li className="p-3 text-center text-xs text-gray-400 font-bold animate-pulse">
                        {t("sit.page.loading")}
                      </li>
                    )}
                    {processes.map((process, index) => {
                      const meta = STATUS_META[process.status];
                      return (
                        <li
                          key={process.id}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${meta.border} ${meta.bg} hover:shadow-sm`}
                        >
                          {/* Step number rail */}
                          <div className="flex flex-col items-center shrink-0">
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black border-2"
                              style={{
                                borderColor: meta.color,
                                color: meta.color,
                                backgroundColor: "white",
                              }}
                            >
                              {index + 1}
                            </div>
                            {index < processes.length - 1 && (
                              <div className="w-0.5 h-4 bg-gray-200 mt-0.5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-800 truncate">
                                {process.dynamic
                                  ? process.name
                                  : t(`sit.page.fixed.${process.name}`)}
                              </span>
                              {process.dynamic ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  {t("sit.page.dynamicBadge")}
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                                  <Lock className="h-2.5 w-2.5" />
                                  {t("sit.page.fixedBadge")}
                                </span>
                              )}
                            </div>
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: meta.color }}
                            >
                              {t(`sit.page.${meta.labelKey}`)}
                            </span>
                            {process.updatedBy && (
                              <span className="text-[10px] text-gray-400 ml-2 inline-flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {process.updatedBy}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {process.status !== "done" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  persist(
                                    processes.map((p) =>
                                      p.id === process.id
                                        ? { ...p, status: "done" as ProcessStatus }
                                        : p,
                                    ),
                                  )
                                }
                                className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold cursor-pointer"
                              >
                                <CircleCheck className="h-4 w-4" />
                              </Button>
                            )}
                            {process.status !== "failed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  persist(
                                    processes.map((p) =>
                                      p.id === process.id
                                        ? { ...p, status: "failed" as ProcessStatus }
                                        : p,
                                    ),
                                  )
                                }
                                className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {process.status !== "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  persist(
                                    processes.map((p) =>
                                      p.id === process.id
                                        ? { ...p, status: "pending" as ProcessStatus }
                                        : p,
                                    ),
                                  )
                                }
                                className="h-8 px-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                                title={t("sit.page.reset")}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {process.dynamic && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProcess(process.id)}
                                className="h-8 px-2 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                title={t("sit.page.remove")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {!isFetchingProcesses && processes.length === 0 && (
                      <li className="p-5 text-center text-xs text-gray-700 font-bold">
                        {t("sit.page.noProcesses")}
                      </li>
                    )}
                  </ol>
                </CardContent>
              </Card>

              <p className="text-xs text-white/80 px-1 flex items-center gap-1.5">
                <Circle className="h-3 w-3" />
                {t("sit.page.hint")}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-700 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl shadow-indigo-950/5 p-8">
              <GitBranch className="h-16 w-16 mb-4 text-[#4F46E5]/30" />
              <p className="font-bold text-base text-gray-800 tracking-tight">
                {t("sit.page.emptyState")}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
