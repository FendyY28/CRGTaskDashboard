import { useState, memo } from "react";
import { TableCell, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, X, Trash2 } from "lucide-react";
import { PROJECT_STATUS, THEME } from "../../../constants/projectConstants"; 
import { api } from "../../../services/api"; 
import type { WeeklyProgress } from "../../../types";

// ✅ 1. Import ProtectAction
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
  const [expanded, setExpanded] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const color = projectStatus.includes('track') || projectStatus === PROJECT_STATUS.COMPLETED ? PROGRESS_COLORS.track : PROGRESS_COLORS.risk;

  const handleCheck = async (tid: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setLoadingId(tid);
    try { 
      await api.patch(`/project/task/${tid}/toggle`); 
      onTaskToggle(); 
    } catch (err: any) { 
      alert(err.message || "Update failed"); 
    } finally { 
      setLoadingId(null); 
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
                
                {/* ✅ 2. Sembunyikan icon hapus Weekly Log */}
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
                      
                      {/* ✅ 3. Fallback Checkbox: HEAD melihat versi statis, OFFICER melihat versi klik */}
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
                        
                        {/* ✅ 4. Sembunyikan icon hapus Task (X) */}
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
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
WeeklyRow.displayName = "WeeklyRow";