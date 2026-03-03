import { useState, memo, type FormEvent } from "react";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Loader2 } from "lucide-react";
import { DashboardInput, DashboardTextarea, DashboardSelect } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants"; 
import { api } from "../../../services/api"; 
import type { Project } from "../../../types";

interface LogActivityFormProps {
  projects: Project[];
  onSuccess: () => void;
}

export const LogActivityForm = memo(({ projects, onSuccess }: LogActivityFormProps) => {
  const [logForm, setLogForm] = useState({ pid: "", week: "", tasks: "" });
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!logForm.pid || !logForm.week) return;
    setIsLogging(true);
    try {
      await api.post(`/project/log`, { 
        projectId: logForm.pid, 
        weekRange: logForm.week, 
        tasks: logForm.tasks.split('\n').filter(t => t), 
        progress: 0 
      });
      setLogForm({ pid: "", week: "", tasks: "" }); 
      onSuccess();
    } catch (err: any) { 
      alert(err.message || "Log failed"); 
    } finally { 
      setIsLogging(false); 
    }
  };

  return (
    <form onSubmit={handleLog} className="space-y-4">
      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Project</Label><DashboardSelect value={logForm.pid} onChange={(e: any) => setLogForm({...logForm, pid: e.target.value})}><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</DashboardSelect></div>
      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Period (Week)</Label><DashboardInput placeholder="e.g. Sprint 1" value={logForm.week} onChange={(e: any) => setLogForm({...logForm, week: e.target.value})} /></div>
      <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Assign Tasks</Label><DashboardTextarea value={logForm.tasks} onChange={(e: any) => setLogForm({...logForm, tasks: e.target.value})} placeholder="Enter tasks (one per line)..." className="min-h-[120px]" /></div>
      <Button type="submit" disabled={isLogging || !logForm.pid || !logForm.week || !logForm.tasks} className="w-full font-bold text-white shadow-md h-10 rounded-xl hover:opacity-90" style={{ backgroundColor: THEME.TOSCA }}>{isLogging ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save & Assign Tasks"}</Button>
    </form>
  );
});
LogActivityForm.displayName = "LogActivityForm";