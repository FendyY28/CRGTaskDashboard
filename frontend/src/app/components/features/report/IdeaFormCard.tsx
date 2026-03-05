import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { DashboardInput, DashboardTextarea, DashboardSelect, DashboardCard } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import type { Project } from "../../../types";
import { useTranslation } from "react-i18next";

const INITIAL_IMP = { projectId: "", title: "", description: "" };

interface IdeaFormCardProps {
  liveProjects: Project[];
  onSubmitImprovement: (data: any) => Promise<any>;
}

export function IdeaFormCard({ liveProjects, onSubmitImprovement }: IdeaFormCardProps) {
  const [impForm, setImpForm] = useState(INITIAL_IMP);
  const [isBusy, setIsBusy] = useState(false);
  const { t } = useTranslation();

  const handleImprovementSubmit = async () => {
    setIsBusy(true);
    const userName = localStorage.getItem('user_name') || "System Admin";

    toast.promise(
      onSubmitImprovement({ 
        ...impForm, 
        noteId: `IMP-${Date.now().toString().slice(-4)}`,
        reviewer: userName, 
        developer: "Team", 
        recommendations: impForm.description, 
        priority: "medium",
        createdDate: new Date().toISOString()
      }),
      {
        loading: t('pirComponents.ideaForm.toast.loading'),
        success: () => {
          setImpForm(INITIAL_IMP);
          setIsBusy(false);
          return t('pirComponents.ideaForm.toast.success');
        },
        error: () => {
          setIsBusy(false);
          return t('pirComponents.ideaForm.toast.error');
        }
      }
    );
  };

  return (
    <DashboardCard color={THEME.TOSCA} title={t('pirComponents.ideaForm.title')} icon={Lightbulb} contentClassName="space-y-4 pt-5 pb-6">
      <DashboardSelect value={impForm.projectId} onChange={(e: any) => setImpForm(p => ({...p, projectId: e.target.value}))}>
        <option value="">{t('pirComponents.ideaForm.labels.select')}</option>
        {liveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </DashboardSelect>

      <DashboardInput 
        value={impForm.title} 
        onChange={(e: any) => setImpForm(p => ({...p, title: e.target.value}))} 
        placeholder={t('pirComponents.ideaForm.placeholders.title')} 
      />

      <DashboardTextarea 
        value={impForm.description} 
        onChange={(e: any) => setImpForm(p => ({...p, description: e.target.value}))} 
        placeholder={t('pirComponents.ideaForm.placeholders.idea')} 
      />
      
      <Button onClick={handleImprovementSubmit} disabled={isBusy || !impForm.projectId || !impForm.title || !impForm.description} className="w-full font-bold text-white rounded-xl border-none hover:opacity-90" style={{ backgroundColor: THEME.TOSCA }}>
        {isBusy ? <Loader2 className="animate-spin h-4 w-4" /> : t('pirComponents.common.submit')}
      </Button>
    </DashboardCard>
  );
}