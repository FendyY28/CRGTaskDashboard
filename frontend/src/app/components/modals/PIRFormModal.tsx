import { useState } from "react";
import { AlertTriangle, Lightbulb, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { DashboardInput, DashboardTextarea, DashboardSelect } from "../dashboard/index";
import { THEME } from "../../constants/projectConstants";
import { useTranslation } from "react-i18next";
import { capitalize } from "../../../lib/utils";

interface PIRFormModalProps {
  activeModal: 'issue' | 'idea' | null;
  onClose: () => void;
  selectedProject: any;
  addIssue: (data: any) => Promise<any>;
  addImprovement: (data: any) => Promise<any>;
  refresh: () => void;
}

export function PIRFormModal({ 
  activeModal, 
  onClose, 
  selectedProject, 
  addIssue, 
  addImprovement, 
  refresh 
}: PIRFormModalProps) {
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState(false);

  const [issueForm, setIssueForm] = useState({ title: "", priority: "medium", description: "" });
  const [impForm, setImpForm] = useState({ title: "", description: "" });

  if (!activeModal || !selectedProject) return null;

  const handleIssueSubmit = async () => {
    if (!issueForm.title) return;
    setIsBusy(true);
    const userName = localStorage.getItem('user_name') || "System Admin";
    
    try {
      await addIssue({ 
        ...issueForm, 
        projectId: selectedProject.id, 
        issueId: `ISS-${Date.now().toString().slice(-4)}`,
        impactArea: "General",
        reportedBy: userName,
        reportedDate: new Date().toISOString(),
        status: "open"
      }); 
      refresh();
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  const handleImprovementSubmit = async () => {
    if (!impForm.title || !impForm.description) return;
    setIsBusy(true);
    const userName = localStorage.getItem('user_name') || "System Admin";

    try {
      await addImprovement({ 
        ...impForm, 
        projectId: selectedProject.id, 
        noteId: `IMP-${Date.now().toString().slice(-4)}`,
        reviewer: userName, 
        developer: "Team", 
        recommendations: impForm.description, 
        priority: "medium",
        createdDate: new Date().toISOString()
      });
      refresh();
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          
          <div className="h-3 w-full" style={{ backgroundColor: activeModal === 'issue' ? '#E11D48' : THEME.TOSCA }} />

          <button onClick={onClose} className="absolute top-6 right-5 p-1.5 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <X className="h-5 w-5" />
          </button>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {activeModal === 'issue' ? (
                  <><AlertTriangle className="h-5 w-5 text-[#E11D48]" /> {t('pir.modalForm.reportIssueTitle')}</>
                ) : (
                  <><Lightbulb className="h-5 w-5 text-[#36A39D]" /> {t('pir.modalForm.addIdeaTitle')}</>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {t('pir.modalForm.forProject')} <span className="font-bold text-gray-800">{selectedProject.name}</span>
              </p>
            </div>

            {activeModal === 'issue' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{t('pir.modalForm.labels.issueTitle')}</Label>
                  <DashboardInput value={issueForm.title} onChange={(e: any) => setIssueForm(p => ({...p, title: e.target.value}))} placeholder={t('pir.modalForm.placeholders.issueTitle')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{t('pir.modalForm.labels.priority')}</Label>
                  <DashboardSelect value={issueForm.priority} onChange={(e: any) => setIssueForm(p => ({...p, priority: e.target.value}))}>
                    {['critical', 'high', 'medium', 'low'].map(c => <option key={c} value={c}>{t(`pir.priorities.${c}`, capitalize(c))}</option>)}
                  </DashboardSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{t('pir.modalForm.labels.issueDesc')}</Label>
                  <DashboardTextarea value={issueForm.description} onChange={(e: any) => setIssueForm(p => ({...p, description: e.target.value}))} placeholder={t('pir.modalForm.placeholders.issueDesc')} />
                </div>
                <Button onClick={handleIssueSubmit} disabled={isBusy || !issueForm.title} className="w-full font-bold bg-[#E11D48] hover:bg-[#be123c] text-white rounded-xl h-11 mt-4">
                  {isBusy ? <Loader2 className="animate-spin h-5 w-5" /> : t('pir.modalForm.buttons.saveIssue')}
                </Button>
              </div>
            )}

            {activeModal === 'idea' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{t('pir.modalForm.labels.ideaTitle')}</Label>
                  <DashboardInput value={impForm.title} onChange={(e: any) => setImpForm(p => ({...p, title: e.target.value}))} placeholder={t('pir.modalForm.placeholders.ideaTitle')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{t('pir.modalForm.labels.ideaDesc')}</Label>
                  <DashboardTextarea value={impForm.description} onChange={(e: any) => setImpForm(p => ({...p, description: e.target.value}))} placeholder={t('pir.modalForm.placeholders.ideaDesc')} />
                </div>
                <Button onClick={handleImprovementSubmit} disabled={isBusy || !impForm.title || !impForm.description} className="w-full font-bold text-white rounded-xl h-11 mt-4 hover:brightness-95" style={{ backgroundColor: THEME.TOSCA }}>
                  {isBusy ? <Loader2 className="animate-spin h-5 w-5" /> : t('pir.modalForm.buttons.saveIdea')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}