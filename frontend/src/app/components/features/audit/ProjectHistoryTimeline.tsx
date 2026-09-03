import { useState, useEffect, useCallback } from "react";
import { History, User, Clock, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../../../services/api";
import { THEME } from "../../../constants/projectConstants";

interface LogEntry {
  id: string;
  action: string;
  details: string;
  userName: string;
  createdAt: string;
  user?: { name: string; email: string; role: string };
  project?: { id: string; name: string } | null;
}

function fmtDate(raw?: string) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_PROJECT: "#16a34a",
  DELETE_PROJECT: "#dc2626",
  UPDATE_PROJECT: "#0891b2",
  CHANGE_PHASE: "#7c3aed",
  UPDATE_STATUS: "#d97706",
  NEXT_CYCLE: "#db2777",
  ADD_PHASE_NOTE: "#0d9488",
  DELETE_PHASE_NOTE: "#f43f5e",
  CREATE_ISSUE: "#ea580c",
  UPDATE_ISSUE: "#0369a1",
  DELETE_ISSUE: "#dc2626",
  ADD_IMPROVEMENT: "#2563eb",
  DELETE_IMPROVEMENT: "#9f1239",
  ADD_WEEKLY_LOG: "#64748b",
  DELETE_WEEKLY_LOG: "#475569",
  CREATE_TEST_CASE: "#16a34a",
  UPDATE_TEST_CASE: "#2563eb",
  DELETE_TEST_CASE: "#dc2626",
  TOGGLE_TASK: "#0d9488",
  DELETE_TASK: "#dc2626",
};

const getActionColor = (action: string) => ACTION_COLORS[action] || THEME.BSI_GREY;

interface ProjectHistoryTimelineProps {
  projectId: string;
}

export function ProjectHistoryTimeline({ projectId }: ProjectHistoryTimelineProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);

  const fetchLogs = useCallback(async () => {
    if (!projectId || !expanded) return;
    setLoading(true);
    try {
      const res = await api.get(`/audit/project/${projectId}?limit=50`);
      setLogs(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Gagal memuat riwayat proyek:", e);
    } finally {
      setLoading(false);
    }
  }, [projectId, expanded]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <button
        type="button"
        onClick={() => { setExpanded(v => !v); setDisplayCount(5); }}
        className="flex items-center justify-between w-full text-left select-none group"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" style={{ color: THEME.TOSCA }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}>
            Riwayat Perubahan Proyek
          </span>
          {logs.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: THEME.TOSCA + "20", color: THEME.TOSCA }}>
              {logs.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <p className="text-[11px] text-center py-4 animate-pulse text-gray-400">Memuat riwayat...</p>
          ) : logs.length === 0 ? (
            <div className="text-center py-6">
              <History className="h-7 w-7 text-gray-200 mx-auto mb-1" />
              <p className="text-[11px] text-gray-400 italic">Belum ada riwayat untuk proyek ini.</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-72 overflow-y-auto pr-1">
              {logs.slice(0, displayCount).map((log, idx) => (
                <div key={log.id} className="flex gap-3 relative group/log">
                  {idx < Math.min(displayCount, logs.length) - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-[-8px] w-[2px] bg-gray-100 group-hover/log:bg-gray-200 transition-colors" />
                  )}
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 mt-1 shadow-sm border-2 border-white"
                    style={{ backgroundColor: getActionColor(log.action) + "20", color: getActionColor(log.action) }}
                  >
                    <Filter className="h-2.5 w-2.5" />
                  </div>
                  <div className="flex-1 min-w-0 pb-3 text-left">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border"
                        style={{ color: getActionColor(log.action), borderColor: getActionColor(log.action) + "40", backgroundColor: getActionColor(log.action) + "10" }}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] text-gray-400 shrink-0">
                        <Clock className="h-2 w-2" /> {fmtDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-700 mt-1 leading-relaxed">{log.details}</p>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                      <User className="h-2.5 w-2.5" /> {log.userName}
                    </span>
                  </div>
                </div>
              ))}

              {logs.length > displayCount && (
                <button
                  type="button"
                  onClick={() => setDisplayCount(c => c + 10)}
                  className="w-full text-center text-[10px] font-semibold py-2 text-gray-400 hover:text-[#38A79C] transition-colors border-t border-gray-100 mt-1"
                >
                  Tampilkan {Math.min(10, logs.length - displayCount)} log lagi ({logs.length - displayCount} tersisa)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
