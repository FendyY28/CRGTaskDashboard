import { useState, useMemo, memo, type FormEvent } from "react";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { DashboardTextarea, DashboardSelect } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import { api } from "../../../services/api";
import type { Project } from "../../../types";
import { weekRangeFrom } from "../../../../lib/utils";
import { useTranslation } from "react-i18next";

// Pemisah antara nama tugas dan deskripsinya pada tiap baris input.
const DESCRIPTION_SEPARATOR = "|";

interface LogActivityFormProps {
  projects: Project[];
  onSuccess: () => void;
}

export const LogActivityForm = memo(({ projects, onSuccess }: LogActivityFormProps) => {
  const { t } = useTranslation();
  const [logForm, setLogForm] = useState({ pid: "", title: "", tasks: "" });
  const [anchorDate, setAnchorDate] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tanggal acuan -> label periode "DD/MM/YYYY - DD/MM/YYYY".
  // weekRange tetap string bebas di DB, jadi log lama tidak ikut berubah.
  const week = useMemo(() => (anchorDate ? weekRangeFrom(anchorDate) : ""), [anchorDate]);

  // Setiap baris = "Nama tugas | Deskripsi pekerjaan" (lihat DESCRIPTION_SEPARATOR).
  // Baris kosong / spasi dobel dibuang. Task tanpa deskripsi tidak digagalkan
  // di sini, cukup diberi peringatan, karena backend juga memvalidasinya.
  const taskLines = useMemo(
    () => logForm.tasks.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean),
    [logForm.tasks]
  );

  const parsedTasks = useMemo(() => {
    return taskLines.map((line) => {
      const idx = line.indexOf(DESCRIPTION_SEPARATOR);
      const taskName = (idx === -1 ? line : line.slice(0, idx)).trim();
      const description = (idx === -1 ? "" : line.slice(idx + DESCRIPTION_SEPARATOR.length)).trim();
      return { taskName, description };
    }).filter((t) => !!t.taskName);
  }, [taskLines]);

  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const line of parsedTasks) {
      const key = line.taskName.toLowerCase();
      if (seen.has(key)) dupes++;
      else seen.add(key);
    }
    return dupes;
  }, [parsedTasks]);

  // Task yang belum diberi deskripsi — dipakai untuk memperingatkan user
  // sebelum submit (backend akan menolak kalau tetap kosong).
  const missingDescriptionCount = useMemo(
    () => parsedTasks.filter((t) => !t.description).length,
    [parsedTasks]
  );

  const canSubmit = !!logForm.pid && !!logForm.title.trim() && !!week && parsedTasks.length > 0
    && missingDescriptionCount === 0 && !isLogging;

  const handleLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSuccess(null);
    setIsLogging(true);

    try {
      await api.post(`/project/log`, {
        projectId: logForm.pid,
        weekRange: week,
        title: logForm.title.trim(),
        tasks: parsedTasks,
        progress: 0
      });
      setLogForm({ pid: "", title: "", tasks: "" });
      setAnchorDate("");
      setSuccess(t('timeline.logForm.success', { count: parsedTasks.length }));
      setTimeout(() => setSuccess(null), 4000);
      onSuccess();
    } catch (err: any) {
      setError(err.message || t('timeline.toast.systemError'));
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <form onSubmit={handleLog} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>{t('timeline.logForm.project')}</Label>
        <DashboardSelect value={logForm.pid} onChange={(e: any) => setLogForm({ ...logForm, pid: e.target.value })}>
          <option value="">{t('timeline.logForm.selectProject')}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </DashboardSelect>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>{t('timeline.logForm.title')}</Label>
        <input
          type="text"
          value={logForm.title}
          onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
          placeholder={t('timeline.logForm.titlePlaceholder')}
          className="w-full text-sm p-3 rounded-xl h-auto bg-gray-50 border border-gray-200 text-gray-700 outline-none focus-visible:ring-1 focus-visible:ring-[#36A39D] focus-visible:ring-offset-0"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>{t('timeline.logForm.period')}</Label>
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
          className="w-full text-sm p-3 rounded-xl h-auto bg-gray-50 border border-gray-200 text-gray-700 outline-none focus-visible:ring-1 focus-visible:ring-[#36A39D] focus-visible:ring-offset-0"
        />
        <p className="text-[10px] font-medium" style={{ color: THEME.BSI_LIGHT_GRAY }}>
          {week
            ? t('timeline.logForm.periodPreview', { range: week })
            : t('timeline.logForm.periodHint')}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>{t('timeline.logForm.tasks')}</Label>
          {parsedTasks.length > 0 && (
            <span className="text-[10px] font-bold" style={{ color: THEME.BSI_LIGHT_GRAY }}>
              {parsedTasks.length} {t('timeline.logForm.tasksUnit')}
            </span>
          )}
        </div>
        <DashboardTextarea value={logForm.tasks} onChange={(e: any) => setLogForm({ ...logForm, tasks: e.target.value })} placeholder={t('timeline.logForm.tasksPlaceholder')} className="min-h-[120px]" />
        <p className="text-[10px] font-medium" style={{ color: THEME.BSI_LIGHT_GRAY }}>
          {t('timeline.logForm.tasksHint')}
        </p>
        {duplicateCount > 0 && (
          <p className="flex items-start gap-1.5 text-[10px] font-medium" style={{ color: THEME.BSI_LIGHT_GOLD }}>
            <AlertCircle className="h-3 w-3 mt-px shrink-0" />
            {t('timeline.logForm.duplicateWarning', { count: duplicateCount })}
          </p>
        )}
        {missingDescriptionCount > 0 && (
          <p className="flex items-start gap-1.5 text-[10px] font-medium" style={{ color: THEME.BSI_LIGHT_GOLD }}>
            <AlertCircle className="h-3 w-3 mt-px shrink-0" />
            {t('timeline.logForm.missingDescription', { count: missingDescriptionCount })}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
          <span className="break-words">{error}</span>
        </p>
      )}
      {success && (
        <p role="status" className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium" style={{ backgroundColor: THEME.BSI_GREEN + '10', color: THEME.BSI_GREEN }}>
          <CheckCircle2 className="h-3.5 w-3.5 mt-px shrink-0" />
          {success}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full font-bold text-white shadow-md h-10 rounded-xl hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: THEME.TOSCA }}>
        {isLogging ? <Loader2 className="h-4 w-4 animate-spin" /> : t('timeline.logForm.submit')}
      </Button>
    </form>
  );
});
LogActivityForm.displayName = "LogActivityForm";