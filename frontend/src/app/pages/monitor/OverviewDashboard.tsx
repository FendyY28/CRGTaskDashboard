import { useState, useMemo } from "react";
import { FolderKanban, CheckCircle2, Clock, LayoutDashboard, Trash2, Loader2, Rocket } from "lucide-react"; 
import { Button } from "../../components/ui/button"; 
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../components/ui/dialog";
import { AddProjectSheet } from "../../components/project/AddProjectSheet";
import { EditProjectSheet } from "../../components/project/EditProjectSheet"; 
import { useProjects } from "../../hooks/useProjects";
import { PageHeader, DashboardKpiCard, DashboardCard } from "../../components/dashboard";
import { PhaseBlock } from "../../components/features/monitor/PhaseBlock";
import { ActivityLog } from "./ActivityLog"; 
import { SDLC_PHASES, PROJECT_STATUS, THEME } from "../../constants/projectConstants";
import { toast } from "sonner";
import type { Project } from "../../types";

const PHASES_LIST = Object.values(SDLC_PHASES);

export function OverviewDashboard() {
  const { projects, loading, refresh, deleteProject } = useProjects();
  const [edit, setEdit] = useState<Project | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    toast.promise(deleteProject(delId), {
      loading: 'Deleting project...',
      success: (result) => {
        if (!result.success) throw new Error(result.message);
        setDelId(null);
        setDeleting(false);
        return 'Project deleted successfully.';
      },
      error: (err) => { 
        setDeleting(false); 
        return err.message || 'Failed to delete project.'; 
      }
    });
  };

  const { stats, phaseBreakdown } = useMemo(() => {
    const s = { total: 0, active: 0, completed: 0, new: 0, deliveredThisMonth: 0 };
    const map: Record<string, Project[]> = {};
    const now = new Date();
    
    projects.forEach(p => {
      s.total++; 
      const createdDate = new Date(p.createdAt);
      if (createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()) s.new++;
      
      const isComp = p.currentPhase === SDLC_PHASES.LIVE && Number(p.overallProgress) === 100;
      isComp ? s.completed++ : s.active++;

      if (isComp && new Date(p.updatedAt).getMonth() === now.getMonth()) s.deliveredThisMonth++;
      if (!map[p.currentPhase]) map[p.currentPhase] = [];
      map[p.currentPhase].push(p);
    });

    const phases = PHASES_LIST.map(ph => {
      const projs = map[ph] || [];
      const prog = projs.length ? Math.round(projs.reduce((a, b) => a + Number(b.overallProgress), 0) / projs.length) : 0;
      return { 
        phase: ph, 
        progress: prog, 
        count: projs.length, 
        projects: projs, 
        status: projs.length ? (prog === 100 ? PROJECT_STATUS.COMPLETED : PROJECT_STATUS.IN_PROGRESS) : PROJECT_STATUS.PENDING 
      };
    });

    return { stats: s, phaseBreakdown: phases };
  }, [projects]);

  if (loading) return <div className={`h-screen flex items-center justify-center text-[${THEME.TOSCA}] font-bold animate-pulse text-lg`}>Initializing Dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Dashboard Overview" 
          description="Real-time project monitoring & statistics." 
        />
        <AddProjectSheet onProjectAdded={() => { refresh(); toast.success("New project created!"); }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardKpiCard label="Total Projects" count={stats.total} icon={FolderKanban} trend={stats.new > 0 ? `+${stats.new} this month` : ""} color={THEME.TOSCA} clickable={false} />
        <DashboardKpiCard label="Active Projects" count={stats.active} icon={Clock} description="Currently in progress" color={THEME.BSI_YELLOW} clickable={false} />
        <DashboardKpiCard label="Completed" count={stats.completed} icon={CheckCircle2} color="#059669" clickable={false} />
        <DashboardKpiCard label="Freshly Live" count={stats.deliveredThisMonth} icon={Rocket} description="Launched this month" color="#8B5CF6" clickable={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DashboardCard 
            icon={LayoutDashboard} 
            color={THEME.TOSCA} 
            title="SDLC Phase Breakdown"
            contentClassName="pt-6 space-y-6"
          >
            {/* Phase Blocks */}
            {phaseBreakdown.map(p => (
              <PhaseBlock key={p.phase} p={p} onEdit={setEdit} onDelete={setDelId} />
            ))}
          </DashboardCard>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <ActivityLog />
          </div>
        </div>
      </div>

      <EditProjectSheet 
        open={!!edit} 
        onOpenChange={(v: boolean) => !v && setEdit(null)} 
        project={edit} 
        onProjectUpdated={() => {
          refresh();
          toast.success("Project updated successfully!");
        }} 
      />

      <Dialog open={!!delId} onOpenChange={(v: boolean) => !v && setDelId(null)}>
        <DialogContent className="bg-white sm:max-w-[400px] p-6 text-center border-none shadow-2xl rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-red-50 rounded-full text-red-600 ring-4 ring-red-50/50">
              <Trash2 className="h-8 w-8" />
            </div>
            <div className="space-y-2 text-center">
              <DialogTitle className="text-xl font-bold text-gray-900">Delete Project?</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Permanently delete project ID: <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{delId}</span>? Action cannot be undone.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-6 flex gap-3 w-full">
            <Button variant="outline" onClick={() => setDelId(null)} disabled={deleting} className="flex-1 rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 transition-colors">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}