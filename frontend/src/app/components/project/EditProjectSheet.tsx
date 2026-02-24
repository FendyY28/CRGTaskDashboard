import { useState, useEffect, type FormEvent } from "react";
import { 
  Loader2, FolderEdit, User, Activity, AlertCircle, 
  PlayCircle, BarChart3, Calculator, Rocket 
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogTitle, DialogFooter 
} from "../../components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "../../components/ui/select";

// 🔥 IMPORTS BARU DARI CONSTANTS DAN API WRAPPER
import { SDLC_PHASES, PROJECT_STATUS } from "../../constants/projectConstants";
import { api } from "../../services/api";

// --- HELPERS LOKAL ---
const getToday = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => d ? new Date(d).toISOString().split('T')[0] : "";
const calcDate = (d: string, n: number, t: 'D' | 'M') => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  t === 'D' ? date.setDate(date.getDate() + n) : date.setMonth(date.getMonth() + n);
  return date.toISOString().split('T')[0];
};
const fmtStatus = (s: string) => s ? s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

// Arrays dari Constants untuk Dropdown
const PHASES_ARRAY = Object.values(SDLC_PHASES);
const STATUS_OPTIONS_ARRAY = [
  PROJECT_STATUS.PENDING, 
  PROJECT_STATUS.ON_TRACK, 
  PROJECT_STATUS.AT_RISK, 
  PROJECT_STATUS.OVERDUE
];

export function EditProjectSheet({ project, open, onOpenChange, onProjectUpdated }: any) {
  // --- STATES ---
  const [isLoading, setIsLoading] = useState(false);
  const [isNextCycleLoading, setIsNextCycleLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false); 
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "", pic: "", currentPhase: "", status: "", overallProgress: "0",
    projectStartDate: "", projectDeadline: "", phaseStartDate: "", phaseDeadline: "", phaseStatus: ""
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!open) {
      setShowConfirm(false); 
      return;
    }

    const fetchExisting = async () => {
      try {
        // 🔥 Menggunakan api wrapper baru (jauh lebih bersih)
        const d = await api.get(`/project`);
        if (Array.isArray(d)) setExistingNames(d.filter((p: any) => p.id !== project?.id).map((p: any) => p.name.toLowerCase()));
      } catch (e) { console.error("Failed to fetch projects", e); }
    };
    fetchExisting();

    if (project) {
      const currentCycle = project.cycle || 1;
      const ph = project.sdlcPhases?.find((p: any) => p.phaseName === project.currentPhase && p.cycle === currentCycle);
      const ps = fmtDate(project.projectStartDate) || getToday();
      const pd = fmtDate(project.projectDeadline) || calcDate(ps, 2, 'M');
      const phs = fmtDate(ph?.startDate) || ps;
      let phd = fmtDate(ph?.deadline) || calcDate(phs, 7, 'D');

      let initialStatus = ph?.status || project.status || PROJECT_STATUS.ON_TRACK;
      if (!STATUS_OPTIONS_ARRAY.includes(initialStatus)) initialStatus = PROJECT_STATUS.ON_TRACK;

      setForm({
        name: project.name || "", pic: project.pic || "",
        currentPhase: project.currentPhase || SDLC_PHASES.REQUIREMENT,
        status: initialStatus, phaseStatus: initialStatus,
        overallProgress: String(project.overallProgress || "0"),
        projectStartDate: ps, projectDeadline: pd,
        phaseStartDate: phs, phaseDeadline: phd
      });
      setErrs({});
    }
  }, [open, project]);

  // --- VALIDATION ---
  useEffect(() => {
    const e: Record<string, string> = {};
    const { name, projectStartDate: ps, projectDeadline: pd, phaseStartDate: phs, phaseDeadline: phd } = form;
    if (name && existingNames.includes(name.trim().toLowerCase())) e.name = "Name used.";
    if (ps && pd && new Date(ps) > new Date(pd)) e.dates = "Invalid project deadline.";
    if (phs && phd && new Date(phs) > new Date(phd)) e.ph = "Invalid phase deadline.";
    setErrs(e);
  }, [form, existingNames]);

  // --- ACTIONS ---
  const handleChange = (k: string, v: string) => {
    setForm(p => {
      const n = { ...p, [k]: v };
      
      if (k === "overallProgress") {
        const prog = parseInt(v);
        if (prog === 100) {
          n.status = (p.status === PROJECT_STATUS.OVERDUE || p.status === PROJECT_STATUS.AT_RISK) ? p.status : PROJECT_STATUS.ON_TRACK;
          n.phaseStatus = n.status;
        } else if (prog === 0) n.phaseStatus = PROJECT_STATUS.PENDING;
        else if (p.phaseStatus === PROJECT_STATUS.PENDING) n.phaseStatus = PROJECT_STATUS.ON_TRACK;
      }
      
      if (k === "status") n.phaseStatus = v;
      if (k === "projectStartDate") n.projectDeadline = calcDate(v, 2, 'M');
      
      // 🔥 SMART DATE AUTOMATION UNTUK FASE
      if (k === "currentPhase" && v !== p.currentPhase) { 
        if (v === SDLC_PHASES.REQUIREMENT) {
             const today = getToday();
             n.projectStartDate = today; n.projectDeadline = calcDate(today, 2, 'M');
             n.phaseStartDate = today; n.phaseDeadline = calcDate(today, 7, 'D');
             n.overallProgress = "0"; n.status = PROJECT_STATUS.ON_TRACK; n.phaseStatus = PROJECT_STATUS.IN_PROGRESS;
        } else {
             const newStartDate = p.phaseDeadline || getToday(); 
             n.phaseStartDate = newStartDate; 
             n.phaseDeadline = calcDate(newStartDate, 7, 'D'); 
             n.overallProgress = "0";
             n.phaseStatus = PROJECT_STATUS.IN_PROGRESS;
        }
      }
      
      if (k === "phaseStartDate") n.phaseDeadline = calcDate(v, 7, 'D');
      return n;
    });
  };

  // 💡 Payload builder (userId sudah tidak perlu disisipkan manual karena di-handle oleh api.ts)
  const getPreparedPayload = () => {
    const dates = ['projectStartDate', 'projectDeadline', 'phaseStartDate', 'phaseDeadline'].reduce(
      (a, k) => ({ ...a, [k]: form[k as keyof typeof form] ? new Date(form[k as keyof typeof form]) : undefined }),
      {}
    );
    return {
      ...form,
      overallProgress: Number(form.overallProgress),
      ...dates,
      updatedAt: new Date()
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (Object.keys(errs).length) return;
    setIsLoading(true);
    try {
      // 🔥 Menggunakan api wrapper (method PATCH)
      await api.patch(`/project/${project.id}`, getPreparedPayload());
      onOpenChange(false);
      onProjectUpdated();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setIsLoading(false); }
  };

  const executeNextCycle = async () => {
    setIsNextCycleLoading(true);
    try {
      // 1. Force Save before cycling (PATCH via API wrapper)
      await api.patch(`/project/${project.id}`, getPreparedPayload());

      // 2. Trigger Next Cycle (POST via API wrapper, body kosong akan otomatis diinjeksi userId)
      await api.post(`/project/${project.id}/next-cycle`, {});

      setShowConfirm(false);
      onOpenChange(false);
      onProjectUpdated();
    } catch (error: any) { alert("Error: " + error.message); }
    finally { setIsNextCycleLoading(false); }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case PROJECT_STATUS.ON_TRACK: return 'text-[#36A39D]';
      case PROJECT_STATUS.OVERDUE: return 'text-red-600';
      case PROJECT_STATUS.AT_RISK: return 'text-[#F9AD3C]';
      default: return 'text-gray-500';
    }
  };

  // 🔥 DOUBLE CONDITION INTEGRITY LOGIC
  const isFormValidForCycle = form.currentPhase === SDLC_PHASES.LIVE && Number(form.overallProgress) === 100;
  const isDatabaseValidForCycle = project?.currentPhase === SDLC_PHASES.LIVE && Number(project?.overallProgress) === 100;
  const isReadyForNextCycle = isFormValidForCycle && isDatabaseValidForCycle;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] bg-white p-0 border-none shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 p-6 flex items-start gap-4 sticky top-0 z-10">
            <div className="p-3 bg-[#36A39D]/10 rounded-xl text-[#36A39D]"><FolderEdit className="h-6 w-6" /></div>
            <div className="text-left flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
                <span>Edit Project: {project?.id}</span>
                {project?.cycle > 1 && (
                  <Badge className="bg-[#36A39D]/10 text-[#36A39D] border-[#36A39D]/20 shadow-none">
                    Cycle {project.cycle}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>Manage project timeline & status.</DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 text-left">
            {/* Core Info */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Project Name</Label>
                <Input value={form.name} onChange={e => handleChange("name", e.target.value)} className={`bg-gray-50/30 ${errs.name ? "border-red-500" : "focus-visible:ring-[#36A39D]"}`} />
                {errs.name && <p className="text-xs text-red-500 flex gap-1 mt-1"><AlertCircle className="w-3 h-3" /> {errs.name}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex gap-2"><User className="w-3.5 h-3.5" /> PIC</Label>
                <Input value={form.pic} onChange={e => handleChange("pic", e.target.value)} className="focus-visible:ring-[#36A39D]" />
              </div>
            </div>

            {/* Phase Management Section */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#36A39D]"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#36A39D]" /><h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Phase Management</h4></div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm">
                  <Label className="text-xs font-bold text-gray-500 uppercase mr-1">Status:</Label>
                  <Select value={form.phaseStatus} onValueChange={v => handleChange("status", v)}>
                    <SelectTrigger className={`h-7 w-auto min-w-[110px] border-none text-xs font-bold uppercase focus:ring-0 px-0 text-right capitalize ${getStatusColor(form.phaseStatus)}`}>
                      <SelectValue>{fmtStatus(form.phaseStatus)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {STATUS_OPTIONS_ARRAY.map(opt => (
                        <SelectItem key={opt} value={opt} className={`${getStatusColor(opt)} font-bold text-xs uppercase`}>
                          {fmtStatus(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase">Active Phase</Label>
                    <Select value={form.currentPhase} onValueChange={v => handleChange("currentPhase", v)}>
                      <SelectTrigger className="bg-white border-slate-300 h-9 font-medium focus:ring-[#36A39D]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">{PHASES_ARRAY.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><Label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Completion</Label><span className="text-xs font-bold text-[#F9AD3C] bg-white border border-[#F9AD3C]/30 px-2 py-0.5 rounded">{form.overallProgress}%</span></div>
                    <Input type="range" min="0" max="100" step="5" value={form.overallProgress} onChange={e => handleChange("overallProgress", e.target.value)} className="cursor-pointer accent-[#F9AD3C] h-2 bg-white rounded-lg appearance-none p-0 border border-slate-300" />
                  </div>
                </div>
                <div className="space-y-3 p-3 rounded-lg border border-slate-200 bg-white/60">
                  {[{ l: "Start", v: form.phaseStartDate, k: "phaseStartDate", i: PlayCircle }, { l: "End", v: form.phaseDeadline, k: "phaseDeadline", i: AlertCircle }].map((f, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><f.i className="w-3 h-3" /> {f.l}</Label>
                      <Input type="date" value={f.v} onChange={e => handleChange(f.k, e.target.value)} className="h-8 text-xs bg-white focus-visible:ring-[#36A39D]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Global Timeline */}
            <div className="grid grid-cols-2 gap-5 pt-4 border-t border-gray-100">
              {[{ l: "Project Start", v: form.projectStartDate, k: "projectStartDate" }, { l: "Project Deadline", v: form.projectDeadline, k: "projectDeadline" }].map((f, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400 uppercase">{f.l}</Label>
                  <Input type="date" value={f.v} onChange={e => handleChange(f.k, e.target.value)} className="h-9 focus-visible:ring-[#36A39D]" />
                </div>
              ))}
            </div>

            {/* Global Status Footer Section */}
            <div className="space-y-2 bg-[#36A39D]/5 p-3 rounded-lg border border-[#36A39D]/10">
              <Label className="text-sm font-bold text-gray-700">Global Project Status</Label>
              <Select value={form.status} onValueChange={v => handleChange("status", v)}>
                <SelectTrigger className="bg-white border-[#36A39D]/20 h-10 focus:ring-[#36A39D] capitalize"><SelectValue>{fmtStatus(form.status)}</SelectValue></SelectTrigger>
                <SelectContent className="bg-white">
                  {STATUS_OPTIONS_ARRAY.map(s => <SelectItem key={s} value={s} className="capitalize">{fmtStatus(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
              <div className="w-full sm:w-auto">
                <Button 
                  type="button" 
                  onClick={() => setShowConfirm(true)} 
                  disabled={!isReadyForNextCycle || isLoading}
                  className={`w-full sm:w-auto font-bold h-11 px-6 rounded-xl shadow-lg gap-2 transition-all 
                    ${isReadyForNextCycle 
                      ? "bg-[#36A39D] hover:bg-[#2b8580] text-white transform hover:scale-105" 
                      : "bg-gray-100 text-gray-400 border-gray-200 shadow-none cursor-not-allowed"}`}
                >
                  <Rocket className="h-4 w-4" /> 
                  {isReadyForNextCycle 
                    ? `Start Cycle ${(project?.cycle || 1) + 1}` 
                    : isFormValidForCycle && !isDatabaseValidForCycle
                      ? "Save Changes First" 
                      : "Set Live 100% First"}
                </Button>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-gray-200 flex-1 sm:flex-none">Cancel</Button>
                <Button type="submit" className="bg-[#36A39D] hover:bg-[#2b8580] text-white rounded-xl shadow-md font-bold transition-all px-8 flex-1 sm:flex-none" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- CONFIRMATION DIALOG --- */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl p-6 border-none shadow-2xl overflow-hidden">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-[#36A39D]/10 text-[#36A39D] rounded-full flex items-center justify-center animate-bounce">
              <Rocket className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-gray-900">Next Cycle?</DialogTitle>
              <DialogDescription className="text-gray-500 px-2">
                This will archive <b>Cycle {project?.cycle || 1}</b> and start <b>Cycle {(project?.cycle || 1) + 1}</b> from the Requirement phase.
              </DialogDescription>
            </div>
          </div>

          <div className="bg-[#F9AD3C]/10 border border-[#F9AD3C]/20 p-4 rounded-2xl flex items-start gap-3 my-4">
            <AlertCircle className="h-5 w-5 text-[#F9AD3C] mt-0.5" />
            <p className="text-[11px] text-[#F9AD3C] font-semibold leading-tight uppercase tracking-wider">
              Note: Current changes will be saved automatically before archiving.
            </p>
          </div>

          <DialogFooter className="flex flex-row gap-3 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold text-gray-400" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button 
              className="flex-1 bg-[#36A39D] hover:bg-[#2b8580] text-white rounded-2xl font-bold shadow-lg shadow-[#36A39D]/20"
              onClick={executeNextCycle}
              disabled={isNextCycleLoading}
            >
              {isNextCycleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Start!"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}