import { useState, memo } from "react";
import { TableCell, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, X, Trash2, Plus } from "lucide-react";
import { PROJECT_STATUS, THEME } from "../../../constants/projectConstants"; 
import { api } from "../../../services/api"; 
import type { ProjectStatus, WeeklyProgress } from "../../../types";
import { useTranslation } from "react-i18next";
import { fmtDate } from "../../../../lib/utils";

import { ProtectAction } from "../../auth/ProtectAction";

const PROGRESS_COLORS = { track: THEME.TOSCA, risk: THEME.BSI_YELLOW, overdue: "#E11D48" };

const formatCompletedDate = (d?: string | null) => fmtDate(d);

interface WeeklyRowProps {
  week: WeeklyProgress;
  projectStatus: ProjectStatus;
  onTaskToggle: () => void;
  onRequestDeleteLog: (id: number) => void;
  onRequestDeleteTask: (id: number) => void;
}

export const WeeklyRow = memo(({ week, projectStatus, onTaskToggle, onRequestDeleteLog, onRequestDeleteTask }: WeeklyRowProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

  const color = projectStatus.includes('track') || projectStatus === PROJECT_STATUS.COMPLETED ? PROGRESS_COLORS.track : PROGRESS_COLORS.risk;

  const handleCheck = async (tid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingId(tid);
    try {
      const completedBy = localStorage.getItem('user_name') || undefined;
      await api.patch(`/project/task/${tid}/toggle`, { completedBy });
      onTaskToggle();
    } catch (err: any) {
      alert(err.message || "Update failed");
    } finally {
      setLoadingId(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !newTaskDescription.trim() || isSavingTask) return;
    setIsSavingTask(true);
    try {
      await api.post(`/project/log/${week.id}/task`, {
        taskName: newTaskName.trim(),
        description: newTaskDescription.trim()
      });
      setNewTaskName("");
      setNewTaskDescription("");
      setIsAddingTask(false);
      onTaskToggle();
    } catch (err: any) {
      alert(err.message || "Gagal menambah tugas");
    } finally {
      setIsSavingTask(false);
    }
  };

  return (
    <>
      <TableRow className="hover:bg-gray-50/50 cursor-pointer group transition-colors relative" onClick={() => setExpanded(!expanded)}>
        <TableCell>
          <div className="flex items-center gap-3 font-semibold group-hover:opacity-80 transition-opacity" style={{ color: THEME.BSI_DARK_GRAY }}>
            {expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>} {week.title?.trim() || week.weekRange}
          </div>
        </TableCell>
        <TableCell>
          <span className="text-xs font-medium" style={{ color: THEME.BSI_GREY }}>{week.weekRange}</span>
        </TableCell>
        <TableCell className="text-center font-medium" style={{ color: THEME.BSI_GREY }}>
          {week.tasks?.filter((t: any) => t.status === PROJECT_STATUS.COMPLETED).length} / {week.tasks?.length || 0}
        </TableCell>
        <TableCell className="min-w-[120px]">
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${week.progress}%`, backgroundColor: color }} />
          </div>
        </TableCell>
        <TableCell className="text-center font-bold relative" style={{ color: THEME.TOSCA }}>
            <div className="flex items-center justify-center gap-3">
                <span>{week.progress}%</span>

                {/* Sembunyikan icon hapus Weekly Log */}
                <ProtectAction>
                  <Button
                      variant="ghost" size="icon"
                      onClick={(e) => { e.stopPropagation(); onRequestDeleteLog(week.id); }}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all absolute right-2 hover:bg-red-50 text-red-500"
                  >
                      <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </ProtectAction>
            </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-gray-50/30 animate-in slide-in-from-top-1">
          <TableCell colSpan={5} className="p-4">
            <div className="grid gap-2">
              {week.tasks?.length > 0 ? week.tasks?.map((task: any) => {
                const isDone = task.status === PROJECT_STATUS.COMPLETED;
                return (
                  <div key={task.id} className="flex items-center justify-center sm:justify-between p-3 rounded-xl border shadow-sm transition-all bg-white group/task" style={{ borderColor: isDone ? THEME.TOSCA + '50' : THEME.BSI_LIGHT_GRAY + '30' }}>
                    <div className="flex items-center gap-3">

                      {/* Fallback Checkbox: HEAD melihat versi statis, OFFICER melihat versi klik */}
                      <ProtectAction
                        fallback={
                          <div
                            className="h-5 w-5 rounded border flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: isDone ? THEME.TOSCA : THEME.BSI_WHITE,
                              borderColor: isDone ? THEME.TOSCA : THEME.BSI_LIGHT_GRAY
                            }}
                          >
                            {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-white"/>}
                          </div>
                        }
                      >
                        <div
                          onClick={(e) => handleCheck(task.id, e)}
                          className="h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors hover:ring-2 ring-[#38A79C]/30"
                          style={{
                            backgroundColor: isDone ? THEME.TOSCA : THEME.BSI_WHITE,
                            borderColor: isDone ? THEME.TOSCA : THEME.BSI_LIGHT_GRAY
                          }}
                        >
                          {loadingId === task.id ? <Loader2 className="h-3 w-3 animate-spin text-white"/> : isDone && <CheckCircle2 className="h-3.5 w-3.5 text-white"/>}
                        </div>
                      </ProtectAction>

                      <div>
                        <p className={`text-sm font-semibold ${isDone ? 'line-through opacity-60' : ''}`} style={{ color: isDone ? THEME.TOSCA : THEME.BSI_DARK_GRAY }}>{task.taskName}</p>
                        {task.description?.trim() && (
                          <p className="text-xs leading-relaxed mt-0.5 max-w-[520px]" style={{ color: THEME.BSI_GREY }}>{task.description}</p>
                        )}
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: THEME.BSI_LIGHT_GRAY }}>{task.taskId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-0.5">
                        {isDone ? (
                          <>
                            <Badge variant="outline" className="text-[10px] font-bold" style={{ color: THEME.TOSCA, borderColor: THEME.TOSCA + '40' }}>
                              {t('timeline.projectCard.completedOn', { date: formatCompletedDate(task.completedDate), defaultValue: `Selesai ${formatCompletedDate(task.completedDate)}` })}
                            </Badge>
                            {task.completedBy && (
                              <span className="text-[10px] italic" style={{ color: THEME.BSI_GREY }}>
                                {t('timeline.projectCard.by', { name: task.completedBy, defaultValue: `oleh ${task.completedBy}` })}
                              </span>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className={`text-[10px] font-bold`} style={{ color: THEME.BSI_GREY, borderColor: THEME.BSI_LIGHT_GRAY + '50' }}>WIP</Badge>
                        )}
                      </div>

                      {/* Sembunyikan icon hapus Task (X) */}
                      <ProtectAction>
                        <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); onRequestDeleteTask(task.id); }}
                            className="h-6 w-6 opacity-0 group-hover/task:opacity-100 transition-all hover:bg-red-50 text-red-500"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                      </ProtectAction>
                    </div>
                  </div>
                );
              }) : <div className="text-center text-xs py-2 italic" style={{ color: THEME.BSI_LIGHT_GRAY }}>No tasks assigned.</div>}

              {/* Form / Tombol Tambah Tugas Tambahan */}
              <ProtectAction>
                {!isAddingTask ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsAddingTask(true); }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border border-dashed border-gray-300 hover:border-[#38A79C] hover:bg-[#38A79C]/5 text-gray-500 hover:text-[#38A79C] transition-all cursor-pointer w-full mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('timeline.projectCard.addTask', 'Tambah Tugas Baru')}</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleAddTask}
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-col gap-2 p-2 bg-white border border-[#38A79C]/50 rounded-xl shadow-xs animate-in fade-in duration-200 mt-1"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder={t('timeline.projectCard.taskPlaceholder', 'Ketik nama tugas baru...')}
                      className="w-full text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-[#38A79C]/50 text-gray-800 placeholder-gray-400 px-2.5 py-1.5"
                      disabled={isSavingTask}
                    />
                    <textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder={t('timeline.projectCard.taskDescriptionPlaceholder', 'Deskripsi pekerjaan (wajib)...')}
                      rows={2}
                      className="w-full text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-[#38A79C]/50 text-gray-800 placeholder-gray-400 px-2.5 py-1.5 resize-y"
                      disabled={isSavingTask}
                    />
                    <div className="flex items-center justify-end gap-1 shrink-0">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newTaskName.trim() || !newTaskDescription.trim() || isSavingTask}
                        className="h-7 text-xs px-3 bg-[#38A79C] hover:bg-[#38A79C]/90 text-white rounded-lg cursor-pointer"
                      >
                        {isSavingTask ? <Loader2 className="h-3 w-3 animate-spin" /> : t('common.save', 'Simpan')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setIsAddingTask(false); setNewTaskName(""); setNewTaskDescription(""); }}
                        className="h-7 text-xs px-2 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </form>
                )}
              </ProtectAction>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
WeeklyRow.displayName = "WeeklyRow";