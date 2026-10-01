import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  Search,
  ShieldCheck,
  User,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";

type Log = {
  id: string;
  action: string;
  details: string;
  userName: string;
  createdAt: string;
  project?: { id: string; name: string } | null;
};

type Meta = {
  users: { id: string; name: string }[];
  actions: string[];
  projects: { id: string; name: string }[];
};

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CREATE_PROJECT: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  UPDATE_PROJECT: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  DELETE_PROJECT: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CHANGE_PHASE: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  UPDATE_STATUS: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  NEXT_CYCLE: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  ADD_PHASE_NOTE: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  DELETE_PHASE_NOTE: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CREATE_ISSUE: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  UPDATE_ISSUE: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  DELETE_ISSUE: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  ADD_IMPROVEMENT: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  DELETE_IMPROVEMENT: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  ADD_WEEKLY_LOG: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  UPDATE_WEEKLY_LOG: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  DELETE_WEEKLY_LOG: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  ADD_TASK: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  TOGGLE_TASK: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  DELETE_TASK: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CREATE_TEST_CASE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  UPDATE_TEST_CASE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  TAKEOUT_TEST_CASE: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const DEFAULT_BADGE_STYLE = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

export function AuditTrailPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  const initialProjectId = searchParams.get("projectId") || "ALL";

  const [logs, setLogs] = useState<Log[]>([]);
  const [meta, setMeta] = useState<Meta>({ users: [], actions: [], projects: [] });
  const [query, setQuery] = useState({
    search: "",
    projectId: initialProjectId,
    action: "ALL",
    userId: "ALL",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit/meta/options").then(setMeta).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...query,
    });
    api
      .get(`/audit?${params}`)
      .then((res: any) => {
        setLogs(Array.isArray(res) ? res : res?.data || []);
        setTotal(Array.isArray(res) ? res.length : res?.total || 0);
      })
      .catch(() => {
        setLogs([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, query]);

  const updateQuery = (key: string, value: string) => {
    setPage(1);
    setQuery((q) => ({ ...q, [key]: value }));
  };

  const isFiltered =
    Boolean(query.search) ||
    query.projectId !== "ALL" ||
    query.action !== "ALL" ||
    query.userId !== "ALL" ||
    Boolean(query.startDate) ||
    Boolean(query.endDate);

  const resetFilters = () => {
    setQuery({
      search: "",
      projectId: "ALL",
      action: "ALL",
      userId: "ALL",
      startDate: "",
      endDate: "",
    });
    setPage(1);
  };

  const exportCsv = () => {
    const headers = [
      t("audit.table.timestamp", "Timestamp"),
      t("audit.table.actor", "Actor"),
      t("audit.table.project", "Project"),
      t("audit.table.action", "Action"),
      t("audit.table.details", "Details"),
    ];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.userName,
      l.project?.name || t("audit.table.systemGlobal", "Sistem / Global"),
      t(`audit.actions.${l.action}`, l.action.replace(/_/g, " ")),
      l.details,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const locale = i18n.language === "en" ? "en-US" : "id-ID";

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white drop-shadow-xs">
            <ShieldCheck className="h-6 w-6 text-white" />
            {t("audit.title", "System Audit Trail")}
          </h2>
          <p className="text-sm text-white/90">
            {t("audit.description", "Comprehensive activity history and accountability records.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("audit.filters.reset", "Reset Semua Filter")}
            </button>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg bg-[#38A79C] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#2c8e85]"
          >
            <Download className="h-4 w-4" />
            {t("audit.exportCsv", "Export CSV")}
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3 lg:grid-cols-6">
        {/* Search */}
        <label className="relative flex flex-col gap-1 lg:col-span-2">
          <span className="text-xs font-semibold text-gray-600">
            {t("audit.filters.searchLabel", "Search activity")}
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={query.search}
              onChange={(e) => updateQuery("search", e.target.value)}
              placeholder={t("audit.filters.searchPlaceholder", "Search by user, action, project, or details...")}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>
        </label>

        {/* Project Filter */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-600">
            {t("audit.filters.projectLabel", "Project")}
          </span>
          <select
            aria-label={t("audit.filters.projectLabel", "Project")}
            value={query.projectId}
            onChange={(e) => updateQuery("projectId", e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          >
            <option value="ALL">{t("audit.filters.allProjects", "All projects")}</option>
            {meta.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {/* Action Filter */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-600">
            {t("audit.filters.actionLabel", "Activity type")}
          </span>
          <select
            aria-label={t("audit.filters.actionLabel", "Activity type")}
            value={query.action}
            onChange={(e) => updateQuery("action", e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          >
            <option value="ALL">{t("audit.filters.allActions", "All activity types")}</option>
            {meta.actions.map((a) => (
              <option key={a} value={a}>
                {t(`audit.actions.${a}`, a.replace(/_/g, " "))}
              </option>
            ))}
          </select>
        </label>

        {/* User Filter */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-600">
            {t("audit.filters.userLabel", "Performed by")}
          </span>
          <select
            aria-label={t("audit.filters.userLabel", "Performed by")}
            value={query.userId}
            onChange={(e) => updateQuery("userId", e.target.value)}
            className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          >
            <option value="ALL">{t("audit.filters.allUsers", "All users")}</option>
            {meta.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        {/* Date Range */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-600">
            {t("audit.filters.dateLabel", "Date range")}
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              aria-label={t("audit.filters.startDate", "Start date")}
              value={query.startDate}
              onChange={(e) => updateQuery("startDate", e.target.value)}
              className="w-1/2 min-w-0 rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none transition focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
            <input
              type="date"
              aria-label={t("audit.filters.endDate", "End date")}
              value={query.endDate}
              onChange={(e) => updateQuery("endDate", e.target.value)}
              className="w-1/2 min-w-0 rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none transition focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-3.5">{t("audit.table.timestamp", "Timestamp")}</th>
                <th className="p-3.5">{t("audit.table.actor", "Actor")}</th>
                <th className="p-3.5">{t("audit.table.project", "Project")}</th>
                <th className="p-3.5">{t("audit.table.action", "Action")}</th>
                <th className="p-3.5">{t("audit.table.details", "Details")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-gray-400 animate-pulse">
                    {t("common.loading", "Loading...")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-gray-400">
                    {t("audit.empty", "No audit records found.")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badgeStyle = ACTION_STYLES[log.action] || DEFAULT_BADGE_STYLE;
                  const formattedDate = new Date(log.createdAt).toLocaleString(locale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={log.id} className="transition hover:bg-teal-50/20">
                      <td className="whitespace-nowrap p-3.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formattedDate}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="font-semibold text-gray-800">{log.userName}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        {log.project ? (
                          <div>
                            <span className="font-medium text-gray-800">{log.project.name}</span>
                            <span className="block font-mono text-[10px] text-gray-400">
                              {log.project.id}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            <Layers className="h-2.5 w-2.5" />
                            {t("audit.table.systemGlobal", "Sistem / Global")}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          {t(`audit.actions.${log.action}`, log.action.replace(/_/g, " "))}
                        </span>
                      </td>
                      <td className="min-w-[260px] p-3.5 text-xs text-gray-600">{log.details}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5">
              <span>{t("audit.pagination.rows", "Rows per page:")}</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-gray-200 px-1.5 py-0.5 outline-none transition focus:border-teal-400"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </label>
            <span>
              {t("audit.pagination.showing", {
                start: startRecord,
                end: endRecord,
                total,
                defaultValue: `Menampilkan ${startRecord}–${endRecord} dari ${total} log`,
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded border border-gray-200 px-3 py-1 font-medium transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("audit.pagination.previous", "Previous")}
            </button>
            <span className="font-semibold text-gray-700">
              {t("audit.pagination.page", {
                current: page,
                total: totalPages,
                defaultValue: `${page} / ${totalPages}`,
              })}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded border border-gray-200 px-3 py-1 font-medium transition hover:bg-gray-50 disabled:opacity-40"
            >
              {t("audit.pagination.next", "Next")}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
