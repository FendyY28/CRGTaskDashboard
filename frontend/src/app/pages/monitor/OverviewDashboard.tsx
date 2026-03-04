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
import { ProtectAction } from "../../components/auth/ProtectAction"; 
import { useTranslation } from "react-i18next";

const PHASES_LIST = Object.values(SDLC_PHASES);

export function OverviewDashboard() {
  const { projects, loading, refresh, deleteProject } = useProjects();
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { t } = useTranslation();

  const executeDelete = async () => {
    if (!projectToDeleteId) return;
    setIsDeleting(true);
    toast.promise(deleteProject(projectToDeleteId), {
      loading: t('dashboard.toast.deleting'),
      success: (result) => {
        if (!result.success) throw new Error(result.message);
        setProjectToDeleteId(null);
        setIsDeleting(false);
        return t('dashboard.toast.deleteSuccess');
      },
      error: (err) => { 
        setIsDeleting(false); 
        return err.message || t('dashboard.toast.deleteFail'); 
      }
    });
  };

  const { dashboardStats, phaseBreakdown } = useMemo(() => {
    const statsCounter = { totalCount: 0, activeCount: 0, completedCount: 0, newThisMonthCount: 0, deliveredThisMonthCount: 0 };
    const projectsGroupedByPhase: Record<string, Project[]> = {};
    const currentDate = new Date();
    
    projects.forEach(project => {
      statsCounter.totalCount++; 
      const createdDate = new Date(project.createdAt);
      
      if (createdDate.getMonth() === currentDate.getMonth() && createdDate.getFullYear() === currentDate.getFullYear()) {
        statsCounter.newThisMonthCount++;
      }
      
      const isProjectCompleted = project.currentPhase === SDLC_PHASES.LIVE && Number(project.overallProgress) === 100;
      
      if (isProjectCompleted) {
        statsCounter.completedCount++;
      } else {
        statsCounter.activeCount++;
      }

      if (isProjectCompleted && new Date(project.updatedAt).getMonth() === currentDate.getMonth()) {
        statsCounter.deliveredThisMonthCount++;
      }
      
      if (!projectsGroupedByPhase[project.currentPhase]) {
        projectsGroupedByPhase[project.currentPhase] = [];
      }
      projectsGroupedByPhase[project.currentPhase].push(project);
    });

    const breakdownData = PHASES_LIST.map(phaseName => {
      const projectsInPhase = projectsGroupedByPhase[phaseName] || [];
      const phaseProgress = projectsInPhase.length ? Math.round(projectsInPhase.reduce((sum, proj) => sum + Number(proj.overallProgress), 0) / projectsInPhase.length) : 0;
      
      return { 
        phase: phaseName, 
        progress: phaseProgress, 
        count: projectsInPhase.length, 
        projects: projectsInPhase, 
        status: projectsInPhase.length ? (phaseProgress === 100 ? PROJECT_STATUS.COMPLETED : PROJECT_STATUS.IN_PROGRESS) : PROJECT_STATUS.PENDING 
      };
    });

    return { dashboardStats: statsCounter, phaseBreakdown: breakdownData };
  }, [projects]);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold animate-pulse text-lg" style={{ color: THEME.TOSCA }}>{t('dashboard.initializing')}</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title={t('dashboard.title')} 
          description={t('dashboard.description')} 
        />
        
        <ProtectAction>
          <AddProjectSheet onProjectAdded={() => { refresh(); toast.success(t('dashboard.toast.createSuccess')); }} />
        </ProtectAction>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardKpiCard 
          label={t('dashboard.totalProjects')} 
          count={dashboardStats.totalCount} 
          icon={FolderKanban} 
          trend={dashboardStats.newThisMonthCount > 0 ? t('dashboard.newThisMonth', { count: dashboardStats.newThisMonthCount }) : ""} 
          color={THEME.TOSCA} 
          clickable={false} 
        />
        <DashboardKpiCard 
          label={t('dashboard.activeProjects')} 
          count={dashboardStats.activeCount} 
          icon={Clock} 
          description={t('dashboard.currentlyInProgress')} 
          color={THEME.BSI_YELLOW} 
          clickable={false} 
        />
        <DashboardKpiCard 
          label={t('dashboard.completed')} 
          count={dashboardStats.completedCount} 
          icon={CheckCircle2} 
          color="#059669" 
          clickable={false} 
        />
        <DashboardKpiCard 
          label={t('dashboard.freshlyLive')} 
          count={dashboardStats.deliveredThisMonthCount} 
          icon={Rocket} 
          description={t('dashboard.launchedThisMonth')} 
          color="#8B5CF6" 
          clickable={false} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2">
          <DashboardCard 
            icon={LayoutDashboard} 
            color={THEME.TOSCA} 
            title={t('dashboard.sdlcBreakdown')}
            className="h-full"
            contentClassName="pt-6 space-y-6"
          >
            {phaseBreakdown.map(phaseData => (
              <PhaseBlock key={phaseData.phase} p={phaseData} onEdit={setProjectToEdit} onDelete={setProjectToDeleteId} />
            ))}
          </DashboardCard>
        </div>
        
        <div className="lg:col-span-1">
          <div className="h-full">
            <ActivityLog />
          </div>
        </div>
      </div>

      <ProtectAction>
        <EditProjectSheet 
          open={!!projectToEdit} 
          onOpenChange={(isOpen: boolean) => !isOpen && setProjectToEdit(null)} 
          project={projectToEdit} 
          onProjectUpdated={() => {
            refresh();
            toast.success(t('dashboard.toast.updateSuccess'));
          }} 
        />
      </ProtectAction>

      <ProtectAction>
        <Dialog open={!!projectToDeleteId} onOpenChange={(isOpen: boolean) => !isOpen && setProjectToDeleteId(null)}>
          <DialogContent className="bg-white sm:max-w-[400px] p-6 text-center border-none shadow-2xl rounded-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-red-50 rounded-full text-red-600 ring-4 ring-red-50/50">
                <Trash2 className="h-8 w-8" />
              </div>
              <div className="space-y-2 text-center">
                <DialogTitle className="text-xl font-bold text-gray-900">{t('dashboard.deleteModal.title')}</DialogTitle>
                <DialogDescription className="text-sm text-gray-400">
                  {t('dashboard.deleteModal.desc1')} <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{projectToDeleteId}</span>{t('dashboard.deleteModal.desc2')}
                </DialogDescription>
              </div>
            </div>
            <div className="mt-6 flex gap-3 w-full">
              <Button variant="outline" onClick={() => setProjectToDeleteId(null)} disabled={isDeleting} className="flex-1 rounded-xl">
                {t('dashboard.deleteModal.cancel')}
              </Button>
              <Button variant="destructive" onClick={executeDelete} disabled={isDeleting} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 transition-colors">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : t('dashboard.deleteModal.confirm')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </ProtectAction>
    </div>
  );
}