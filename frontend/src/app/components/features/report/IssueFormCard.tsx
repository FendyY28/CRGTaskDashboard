import { useState } from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { capitalize } from "../../../../lib/utils"; 
import { DashboardInput, DashboardTextarea, DashboardSelect, DashboardCard } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import type { Project } from "../../../types";
import { useTranslation } from "react-i18next";

const INITIAL_ISSUE = { projectId: "", title: "", priority: "medium", description: "" };

interface IssueFormCardProps {
  liveProjects: Project[];
  onSubmitIssue: (data: any) => Promise<any>; 
}

export function IssueFormCard({ liveProjects, onSubmitIssue }: IssueFormCardProps) {
  const [issueForm, setIssueForm] = useState(INITIAL_ISSUE);
  const [isBusy, setIsBusy] = useState(false);
  const { t } = useTranslation();

  const handleIssueSubmit = async () => {
    setIsBusy(true);
    const userName = localStorage.getItem('user_name') || "System Admin";
    
    toast.promise(
      onSubmitIssue({ 
        ...issueForm, 
        issueId: `ISS-${Date.now().toString().slice(-4)}`,
        impactArea: "General",
        reportedBy: userName,
        reportedDate: new Date().toISOString(),
        status: "open"
      }), 
      {
        loading: t('pirComponents.issueForm.toast.loading'),
        success: () => {
          setIssueForm(INITIAL_ISSUE);
          setIsBusy(false);
          return t('pirComponents.issueForm.toast.success');
        },
        error: () => {
          setIsBusy(false);
          return t('pirComponents.issueForm.toast.error');
        }
      }
    );
  };

  return (
    <DashboardCard color="#E11D48" title={t('pirComponents.issueForm.title')} icon={PlusCircle} contentClassName="space-y-4 pt-5 pb-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>{t('pirComponents.issueForm.labels.project')}</Label>
            <DashboardSelect value={issueForm.projectId} onChange={(e: any) => setIssueForm(p => ({...p, projectId: e.target.value}))}>
                <option value="">{t('pirComponents.issueForm.labels.select')}</option>
                {liveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </DashboardSelect>
        </div>
        <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>{t('pirComponents.issueForm.labels.priority')}</Label>
            <DashboardSelect value={issueForm.priority} onChange={(e: any) => setIssueForm(p => ({...p, priority: e.target.value}))}>
                {['critical', 'high', 'medium', 'low'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
            </DashboardSelect>
        </div>
      </div>
      <DashboardInput value={issueForm.title} onChange={(e: any) => setIssueForm(p => ({...p, title: e.target.value}))} placeholder={t('pirComponents.issueForm.placeholders.summary')} />
      <DashboardTextarea value={issueForm.description} onChange={(e: any) => setIssueForm(p => ({...p, description: e.target.value}))} placeholder={t('pirComponents.issueForm.placeholders.details')} />
      <Button onClick={handleIssueSubmit} disabled={isBusy || !issueForm.projectId || !issueForm.title} className="w-full font-bold bg-[#E11D48] hover:bg-[#be123c] text-white rounded-xl">
        {isBusy ? <Loader2 className="animate-spin h-4 w-4" /> : t('pirComponents.common.submit')}
      </Button>
    </DashboardCard>
  );
}