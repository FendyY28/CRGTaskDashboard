import { useEffect, useMemo, useState } from "react";
import { Download, Search, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";
import { THEME } from "../../constants/projectConstants";
import { useTranslation } from "react-i18next";

type Log = { id: string; action: string; details: string; userName: string; createdAt: string; project?: { id: string; name: string } | null };
type Meta = { users: { id: string; name: string }[]; actions: string[]; projects: { id: string; name: string }[] };

export function AuditTrailPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<Log[]>([]);
  const [meta, setMeta] = useState<Meta>({ users: [], actions: [], projects: [] });
  const [query, setQuery] = useState({ search: "", projectId: "ALL", action: "ALL", userId: "ALL", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/audit/meta/options").then(setMeta).catch(() => undefined); }, []);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...query });
    api.get(`/audit?${params}`).then((res: any) => { setLogs(Array.isArray(res) ? res : res?.data || []); setTotal(Array.isArray(res) ? res.length : res?.total || 0); }).catch(() => { setLogs([]); setTotal(0); }).finally(() => setLoading(false));
  }, [page, limit, query]);

  const updateQuery = (key: string, value: string) => { setPage(1); setQuery(q => ({ ...q, [key]: value })); };
  const exportCsv = () => {
    const header = ["Timestamp", "Actor", "Project", "Action", "Details"];
    const rows = logs.map(l => [new Date(l.createdAt).toISOString(), l.userName, l.project?.name || "-", l.action, l.details]);
    const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '"')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "audit-trail.csv"; link.click(); URL.revokeObjectURL(url);
  };
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageLabel = useMemo(() => `${page} / ${totalPages}`, [page, totalPages]);

  return <div className="space-y-6 text-left">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ShieldCheck style={{ color: THEME.TOSCA }} />{t("audit.title", "System Audit Trail")}</h2><p className="text-sm text-gray-500">{t("audit.description", "Comprehensive activity history and accountability records.")}</p></div><button onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-[#38A79C] px-4 py-2 text-sm font-bold text-white hover:bg-[#2c8e85]"><Download className="h-4 w-4" />CSV</button></div>
    <div className="grid grid-cols-1 gap-3 rounded-xl border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3 lg:grid-cols-6">
      <label className="relative lg:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={query.search} onChange={e => updateQuery("search", e.target.value)} placeholder={t("audit.search", "Search activity...")} className="w-full rounded-lg border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-400" /></label>
      <select value={query.projectId} onChange={e => updateQuery("projectId", e.target.value)} className="rounded-lg border-gray-200 px-2 text-sm"><option value="ALL">{t("common.all", "All projects")}</option>{meta.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <select value={query.action} onChange={e => updateQuery("action", e.target.value)} className="rounded-lg border-gray-200 px-2 text-sm"><option value="ALL">{t("common.all", "All actions")}</option>{meta.actions.map(a => <option key={a} value={a}>{a}</option>)}</select>
      <select value={query.userId} onChange={e => updateQuery("userId", e.target.value)} className="rounded-lg border-gray-200 px-2 text-sm"><option value="ALL">{t("common.all", "All users")}</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <div className="flex gap-2"><input type="date" value={query.startDate} onChange={e => updateQuery("startDate", e.target.value)} className="min-w-0 w-1/2 rounded-lg border-gray-200 px-2 text-xs" /><input type="date" value={query.endDate} onChange={e => updateQuery("endDate", e.target.value)} className="min-w-0 w-1/2 rounded-lg border-gray-200 px-2 text-xs" /></div>
    </div>
    <div className="overflow-hidden rounded-xl border-gray-100 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Timestamp</th><th className="p-3">Actor</th><th className="p-3">Project</th><th className="p-3">Action</th><th className="p-3">Details</th></tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">{t("common.loading", "Loading...")}</td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">{t("audit.empty", "No audit records found.")}</td></tr> : logs.map(log => <tr key={log.id} className="hover:bg-teal-50/30"><td className="whitespace-nowrap p-3 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3 font-semibold">{log.userName}</td><td className="p-3">{log.project?.name || "-"}</td><td className="p-3"><span className="rounded bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">{log.action}</span></td><td className="min-w-[260px] p-3 text-gray-600">{log.details}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-gray-100 p-3 text-xs text-gray-500"><label>Rows: <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded border px-1"><option>10</option><option>25</option><option>50</option></select></label><div className="flex items-center gap-3"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><span>{pageLabel}</span><button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div></div>
  </div>;
}

