import { useState, memo } from "react";
import { TableCell, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, X, Trash2, Plus } from "lucide-react";
import { PROJECT_STATUS, THEME } from "../../../constants/projectConstants"; 
import { api } from "../../../services/api"; 
import type { WeeklyProgress } from "../../../types";
import { useTranslation } from "react-i18next";

import { ProtectAction } from "../../auth/ProtectAction"; 

const PROGRESS_COLORS = { track: THEME.TOSCA, risk: THEME.BSI_YELLOW, overdue: "#E11D48" }; 

interface WeeklyRowProps {
  week: WeeklyProgress;
  projectStatus: string;
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
    if (!newTaskName.trim() || isSavingTask) return;
    setIsSavingTask(true);
    try {
      await api.post(`/project/log/${week.id}/task`, { taskName: newTaskName.trim() });
      setNewTaskName("");
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
            {expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>} {week.weekRange}
          </div>
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
          <TableCell colSpan={4} className="p-4">
            <div className="grid gap-2">
              {week.tasks?.length > 0 ? week.tasks?.map((t: any) => {
                const isDone = t.status === PROJECT_STATUS.COMPLETED;
                return (
                  <div key={t.id} className="flex items-center justify-center sm:justify-between p-3 rounded-xl border shadow-sm transition-all bg-white group/task" style={{ borderColor: isDone ? THEME.TOSCA + '50' : THEME.BSI_LIGHT_GRAY + '30' }}>
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
                          onClick={(e) => handleCheck(t.id, e)} 
                          className="h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors hover:ring-2 ring-[#38A79C]/30"
                          style={{ 
                            backgroundColor: isDone ? THEME.TOSCA : THEME.BSI_WHITE,
                            borderColor: isDone ? THEME.TOSCA : THEME.BSI_LIGHT_GRAY
                          }}
                        >
                          {loadingId === t.id ? <Loader2 className="h-3 w-3 animate-spin text-white"/> : isDone && <CheckCircle2 className="h-3.5 w-3.5 text-white"/>}
                        </div>
                      </ProtectAction>

                      <div>
                        <p className={`text-sm font-semibold ${isDone ? 'line-through opacity-60' : ''}`} style={{ color: isDone ? THEME.TOSCA : THEME.BSI_DARK_GRAY }}>{t.taskName}</p>
                        <p className="text-[10px] font-mono" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t.taskId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold`} style={{ color: isDone ? THEME.TOSCA : THEME.BSI_GREY, borderColor: isDone ? THEME.TOSCA + '40' : THEME.BSI_LIGHT_GRAY + '50' }}>{isDone ? 'DONE' : 'WIP'}</Badge>
                        
                        {/* Sembunyikan icon hapus Task (X) */}
                        <ProtectAction>
                          <Button
                              variant="ghost" size="icon"
                              onClick={(e) => { e.stopPropagation(); onRequestDeleteTask(t.id); }}
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
                    className="flex items-center gap-2 p-2 bg-white border border-[#38A79C]/50 rounded-xl shadow-xs animate-in fade-in duration-200 mt-1"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder={t('timeline.projectCard.taskPlaceholder', 'Ketik nama tugas baru...')}
                      className="flex-1 text-xs border-none bg-transparent focus:outline-none text-gray-800 placeholder-gray-400 px-2"
                      disabled={isSavingTask}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newTaskName.trim() || isSavingTask}
                        className="h-7 text-xs px-3 bg-[#38A79C] hover:bg-[#38A79C]/90 text-white rounded-lg cursor-pointer"
                      >
                        {isSavingTask ? <Loader2 className="h-3 w-3 animate-spin" /> : t('common.save', 'Simpan')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setIsAddingTask(false); setNewTaskName(""); }}
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