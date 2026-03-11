import { useState, useEffect, type FormEvent } from "react";
import { Loader2, FolderEdit, User, Activity, PlayCircle, BarChart3, Rocket, AlertCircle } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Label } from "../../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { SDLC_PHASES, PROJECT_STATUS, THEME } from "../../../constants/projectConstants"; 

import { api } from "../../../services/api";
import { capitalize } from "../../../../lib/utils";
import { useTranslation } from "react-i18next";
import { getToday, toFormDate, calcDate, getStatusColor, PHASES_ARRAY, STATUS_OPTIONS_ARRAY, INITIAL_FORM_STATE } from "./editProjectUtils";
import { NextCycleModal, RollbackModal } from "../../modals/EditProjectModals";

export function EditProjectSheet({ project, open, onOpenChange, onProjectUpdated }: any) {
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [isNextCycleLoading, setIsNextCycleLoading] = useState(false);
  const [isRollbackLoading, setIsRollbackLoading] = useState(false);
  
  const [showConfirm, setShowConfirm] = useState(false); 
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  
  const [targetRollbackPhase, setTargetRollbackPhase] = useState("");
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [form, setForm] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    if (!open) {
      setShowConfirm(false); 
      setShowRollbackConfirm(false);
      return;
    }
    
    const fetchExistingProjects = async () => {
      try {
        const data = await api.get(`/project`);
        if (Array.isArray(data)) setExistingNames(data.filter((p: any) => p.id !== project?.id).map((p: any) => p.name.toLowerCase()));
      } catch (e) { console.error(e); }
    };
    fetchExistingProjects();

    if (project) {
      const activePhaseData = project.sdlcPhases?.find((p: any) => p.phaseName === project.currentPhase && p.cycle === (project.cycle || 1));
      const pStart = toFormDate(project.projectStartDate) || getToday();
      const phStart = toFormDate(activePhaseData?.startDate) || pStart;

      let initStatus = activePhaseData?.status || project.status || PROJECT_STATUS.ON_TRACK;
      if (!STATUS_OPTIONS_ARRAY.includes(initStatus)) initStatus = PROJECT_STATUS.ON_TRACK;

      setForm({
        name: project.name || "", pic: project.pic || "",
        currentPhase: project.currentPhase || SDLC_PHASES.REQUIREMENT,
        status: initStatus, phaseStatus: initStatus,
        overallProgress: String(project.overallProgress || "0"),
        projectStartDate: pStart, projectDeadline: toFormDate(project.projectDeadline) || calcDate(pStart, 2, 'M'),
        phaseStartDate: phStart, phaseDeadline: toFormDate(activePhaseData?.deadline) || calcDate(phStart, 7, 'D')
      });
      setErrs({});
    }
  }, [open, project]);

  useEffect(() => {
    const e: Record<string, string> = {};
    if (form.name && existingNames.includes(form.name.trim().toLowerCase())) e.name = "nameUsed";
    if (form.projectStartDate && form.projectDeadline && new Date(form.projectStartDate) > new Date(form.projectDeadline)) e.dates = "invalidProjDeadline";
    if (form.phaseStartDate && form.phaseDeadline && new Date(form.phaseStartDate) > new Date(form.phaseDeadline)) e.ph = "invalidPhaseDeadline";
    setErrs(e);
  }, [form, existingNames]);

  const handleChange = (k: string, v: string) => {
    setForm(p => {
      const n = { ...p, [k]: v };
      if (k === "overallProgress") {
        if (v === "100") n.phaseStatus = n.status = (p.status === PROJECT_STATUS.OVERDUE || p.status === PROJECT_STATUS.AT_RISK) ? p.status : PROJECT_STATUS.ON_TRACK;
        else if (v === "0") n.phaseStatus = PROJECT_STATUS.PENDING;
        else if (p.phaseStatus === PROJECT_STATUS.PENDING) n.phaseStatus = PROJECT_STATUS.ON_TRACK;
      }
      if (k === "status") n.phaseStatus = v;
      if (k === "projectStartDate") n.projectDeadline = calcDate(v, 2, 'M');
      if (k === "phaseStartDate") n.phaseDeadline = calcDate(v, 7, 'D');
      if (k === "currentPhase" && v !== p.currentPhase) {
        n.phaseStartDate = v === SDLC_PHASES.REQUIREMENT ? getToday() : (p.phaseDeadline || getToday());
        n.phaseDeadline = calcDate(n.phaseStartDate, 7, 'D');
        n.overallProgress = "0"; n.phaseStatus = PROJECT_STATUS.IN_PROGRESS;
        if (v === SDLC_PHASES.REQUIREMENT) { n.projectStartDate = n.phaseStartDate; n.projectDeadline = calcDate(n.phaseStartDate, 2, 'M'); n.status = PROJECT_STATUS.ON_TRACK; }
      }
      return n;
    });
  };

  const handleSmartPhaseChange = (v: string) => {
    const oldIndex = PHASES_ARRAY.indexOf(project?.currentPhase || "");
    if (oldIndex !== -1 && PHASES_ARRAY.indexOf(v) < oldIndex) {
      setTargetRollbackPhase(v); setShowRollbackConfirm(true);
    } else handleChange("currentPhase", v); 
  };

  const getPreparedPayload = () => ({
    ...form, overallProgress: Number(form.overallProgress),
    projectStartDate: form.projectStartDate ? new Date(form.projectStartDate) : undefined,
    projectDeadline: form.projectDeadline ? new Date(form.projectDeadline) : undefined,
    phaseStartDate: form.phaseStartDate ? new Date(form.phaseStartDate) : undefined,
    phaseDeadline: form.phaseDeadline ? new Date(form.phaseDeadline) : undefined,
    updatedAt: new Date()
  });

  const saveProjectChanges = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (Object.keys(errs).length) return;
    setIsLoading(true);
    try { await api.patch(`/project/${project.id}`, getPreparedPayload()); onOpenChange(false); onProjectUpdated(); }
    catch (err: any) { alert(t('editProject.errors.systemError') + err.message); }
    finally { setIsLoading(false); }
  };

  const executeNextCycle = async () => {
    setIsNextCycleLoading(true);
    try { await api.patch(`/project/${project.id}`, getPreparedPayload()); await api.post(`/project/${project.id}/next-cycle`, {}); setShowConfirm(false); onOpenChange(false); onProjectUpdated(); }
    catch (error: any) { alert(t('editProject.errors.systemError') + error.message); }
    finally { setIsNextCycleLoading(false); }
  };

  const executeRollback = async () => {
    setIsRollbackLoading(true);
    try { await api.patch(`/project/${project.id}`, getPreparedPayload()); await api.post(`/project/${project.id}/next-cycle`, { targetPhase: targetRollbackPhase }); setShowRollbackConfirm(false); onOpenChange(false); onProjectUpdated(); }
    catch (error: any) { alert(t('editProject.errors.systemError', 'Error: ') + error.message); }
    finally { setIsRollbackLoading(false); }
  };

  const isReadyForNextCycle = form.currentPhase === SDLC_PHASES.LIVE && Number(form.overallProgress) === 100 && project?.currentPhase === SDLC_PHASES.LIVE && Number(project?.overallProgress) === 100;
  const isFormValidButUnsaved = form.currentPhase === SDLC_PHASES.LIVE && Number(form.overallProgress) === 100 && !isReadyForNextCycle;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] bg-white p-0 border-none shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          {/* HEADER */}
          <div className="bg-white border-b border-gray-100 p-6 flex items-start gap-4 sticky top-0 z-10">
            <div style={{ backgroundColor: `${THEME.TOSCA}1A`, color: THEME.TOSCA }} className="p-3 rounded-xl"><FolderEdit className="h-6 w-6" /></div>
            <div className="text-left flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
                <span>{t('editProject.title', { id: project?.id })}</span>
                {project?.cycle > 1 && <Badge style={{ backgroundColor: `${THEME.TOSCA}1A`, color: THEME.TOSCA, borderColor: `${THEME.TOSCA}33` }} className="shadow-none">{t('editProject.cycleBadge', { cycle: project.cycle })}</Badge>}
              </DialogTitle>
              <DialogDescription>{t('editProject.description')}</DialogDescription>
            </div>
          </div>

          <form onSubmit={saveProjectChanges} className="p-6 space-y-6 text-left">
            {/* CORE INFO */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-gray-600">{t('editProject.labels.projectName')}</Label>
                <Input 
                  value={form.name} 
                  onChange={e => handleChange("name", e.target.value)} 
                  className={`bg-gray-50/50 border-gray-200 focus-visible:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[${THEME.TOSCA}] transition-all duration-300 ${errs.name ? "border-red-500" : ""}`} 
                />
                {errs.name && <p className="text-xs text-red-500">{t(`editProject.errors.${errs.name}`)}</p>}
              </div>
              <div className="space-y-2">
                <Label className="flex gap-2 text-gray-600"><User className="w-3.5 h-3.5" /> {t('editProject.labels.pic')}</Label>
                <Input 
                  value={form.pic} 
                  onChange={e => handleChange("pic", e.target.value)} 
                  className={`bg-gray-50/50 border-gray-200 focus-visible:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[${THEME.TOSCA}] transition-all duration-300`}
                />
              </div>
            </div>

            {/* PHASE MGT */}
            <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-5 relative overflow-hidden">
              <div style={{ backgroundColor: THEME.TOSCA }} className="absolute top-0 left-0 w-1 h-full"></div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Activity style={{ color: THEME.TOSCA }} className="h-5 w-5" />
                  <h4 className="text-sm font-bold uppercase">{t('editProject.labels.phaseManagement')}</h4>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm border-gray-100">
                  <Label className="text-[11px] font-bold text-gray-400 uppercase">{t('editProject.labels.status')}</Label>
                  <Select value={form.phaseStatus} onValueChange={v => handleChange("status", v)}>
                    <SelectTrigger className={`h-7 w-auto min-w-[110px] border-none text-xs font-bold uppercase text-right focus:ring-0 focus:ring-offset-0 shadow-none ${getStatusColor(form.phaseStatus)}`}>
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-100 shadow-xl rounded-xl">
                      {STATUS_OPTIONS_ARRAY.map(opt => <SelectItem key={opt} value={opt} className={`${getStatusColor(opt)} font-bold text-xs uppercase cursor-pointer hover:bg-gray-50`}>{capitalize(opt)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase">{t('editProject.labels.activePhase')}</Label>
                    <Select value={form.currentPhase} onValueChange={handleSmartPhaseChange}>
                      <SelectTrigger className={`bg-white h-9 border-gray-200 focus:ring-0 focus:ring-offset-0 focus:border-[${THEME.TOSCA}] transition-all duration-300`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-100 shadow-xl rounded-xl">
                        {PHASES_ARRAY.map(p => <SelectItem key={p} value={p} className="cursor-pointer hover:bg-gray-50">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {t('editProject.labels.completion')}</Label>
                      <span style={{ color: THEME.BSI_YELLOW, borderColor: `${THEME.BSI_YELLOW}4D` }} className="text-xs font-bold bg-white border px-2 py-0.5 rounded">{form.overallProgress}%</span>
                    </div>
                    <Input 
                      type="range" 
                      min="0" max="100" step="5" 
                      value={form.overallProgress} 
                      onChange={e => handleChange("overallProgress", e.target.value)} 
                      style={{ accentColor: THEME.BSI_YELLOW }}
                      className="cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none border-none focus:outline-none focus:ring-0 focus-visible:ring-0" 
                    />
                  </div>
                </div>

                <div className="space-y-3 p-3 rounded-lg border border-white bg-white shadow-sm">
                  {[{ l: t('editProject.labels.start'), v: form.phaseStartDate, k: "phaseStartDate", i: PlayCircle }, { l: t('editProject.labels.end'), v: form.phaseDeadline, k: "phaseDeadline", i: AlertCircle }].map((f, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><f.i className="w-3 h-3" /> {f.l}</Label>
                      <Input 
                        type="date" 
                        value={f.v} 
                        onChange={e => handleChange(f.k, e.target.value)} 
                        className={`h-8 text-xs bg-gray-50/50 border-gray-100 hover:border-gray-200 focus-visible:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[${THEME.TOSCA}] transition-all duration-300`} 
                      />
                    </div>
                  ))}
                  {errs.ph && <p className="text-[10px] text-red-500"><AlertCircle className="w-2.5 h-2.5 inline" /> {t(`editProject.errors.${errs.ph}`)}</p>}
                </div>
              </div>
              
              {isFormValidButUnsaved && <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100"><AlertCircle className="h-3 w-3" /> {t('editProject.warnings.saveFirst')}</div>}
            </div>

            {/* GLOBAL TIMELINE & STATUS */}
            <div className="grid grid-cols-2 gap-5 pt-4 border-t border-gray-100">
              {[{ l: t('editProject.labels.projectStart'), v: form.projectStartDate, k: "projectStartDate" }, { l: t('editProject.labels.projectDeadline'), v: form.projectDeadline, k: "projectDeadline" }].map((f, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-[11px] font-bold text-gray-400 uppercase">{f.l}</Label>
                  <Input 
                    type="date" 
                    value={f.v} 
                    onChange={e => handleChange(f.k, e.target.value)} 
                    className={`h-9 bg-gray-50/50 border-gray-200 focus-visible:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[${THEME.TOSCA}] transition-all duration-300 ${i===1 && errs.dates ? 'border-red-500' : ''}`} 
                  />
                </div>
              ))}
              {errs.dates && <div className="col-span-2 mt-[-5px] text-[10px] text-red-500"><AlertCircle className="w-2.5 h-2.5 inline" /> {t(`editProject.errors.${errs.dates}`)}</div>}
            </div>
            
            <div className="space-y-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <Label className="text-[11px] font-bold text-gray-400 uppercase">{t('editProject.labels.globalStatus')}</Label>
              <Select value={form.status} onValueChange={v => handleChange("status", v)}>
                <SelectTrigger className={`bg-white h-10 capitalize border-gray-200 focus:ring-0 focus:ring-offset-0 focus:border-[${THEME.TOSCA}] transition-all duration-300`}>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-100 shadow-xl rounded-xl">
                  {STATUS_OPTIONS_ARRAY.map(s => <SelectItem key={s} value={s} className="capitalize cursor-pointer hover:bg-gray-50">{capitalize(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ACTIONS BAR */}
            <div className="pt-2 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
              <div className="w-full sm:w-auto">
                <Button 
                  type="button" 
                  onClick={() => setShowConfirm(true)} 
                  disabled={!isReadyForNextCycle || isLoading} 
                  style={isReadyForNextCycle ? { backgroundColor: THEME.TOSCA } : {}}
                  className={`w-full sm:w-auto font-bold h-10 px-5 rounded-xl shadow-md gap-2 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ${isReadyForNextCycle ? "text-white hover:brightness-95 hover:scale-105" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                >
                  <Rocket className="h-4 w-4" /> 
                  {isReadyForNextCycle ? t('editProject.buttons.startCycle', { cycle: (project?.cycle || 1) + 1 }) : isFormValidButUnsaved ? t('editProject.buttons.saveChangesFirst') : t('editProject.buttons.setLiveFirst')}
                </Button>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-gray-200 hover:bg-gray-50 focus-visible:ring-0 h-10">
                  {t('editProject.buttons.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  style={{ backgroundColor: THEME.TOSCA }}
                  className="text-white hover:brightness-95 rounded-xl shadow-md font-bold px-8 focus-visible:ring-0 h-10 transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('editProject.buttons.saveChanges')}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <NextCycleModal open={showConfirm} onOpenChange={setShowConfirm} project={project} isLoading={isNextCycleLoading} onConfirm={executeNextCycle} />
      <RollbackModal open={showRollbackConfirm} onOpenChange={setShowRollbackConfirm} project={project} targetPhase={targetRollbackPhase} isLoading={isRollbackLoading} onConfirm={executeRollback} />
    </>
  );
}