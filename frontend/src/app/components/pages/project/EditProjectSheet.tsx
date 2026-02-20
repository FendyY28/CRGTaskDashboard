import { useState, useEffect, type FormEvent } from "react";
import { Loader2, FolderEdit, User, Activity, AlertCircle, PlayCircle, BarChart3, Calculator } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter } from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
// Pastikan path ini sesuai
import { API_URL } from "../../../../lib/utils";

// --- HELPERS ---
const getToday = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => d ? new Date(d).toISOString().split('T')[0] : "";
const calcDate = (d: string, n: number, t: 'D'|'M') => { 
  const date = new Date(d); 
  if(isNaN(date.getTime())) return ""; 
  t === 'D' ? date.setDate(date.getDate() + n) : date.setMonth(date.getMonth() + n); 
  return date.toISOString().split('T')[0]; 
};
const fmtStatus = (s: string) => s ? s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";

/**
 * ✅ HELPER: AMBIL ID USER DARI TOKEN ASLI
 */
const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token || token === "mock-jwt-token") {
        // Fallback ke email jika token masih mock atau tidak ada
        return localStorage.getItem('user_email') || null;
    }
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const parsed = JSON.parse(jsonPayload);
    return parsed.sub || parsed.id || parsed.email; 
  } catch (e) {
    return localStorage.getItem('user_email');
  }
};

const PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];
const STATUS_OPTIONS = ["pending", "on-track", "at-risk", "overdue"]; 

export function EditProjectSheet({ project, open, onOpenChange, onProjectUpdated }: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ 
    name: "", pic: "", currentPhase: "", status: "", overallProgress: "0", 
    projectStartDate: "", projectDeadline: "", phaseStartDate: "", phaseDeadline: "", phaseStatus: "" 
  });

  // 1. Inisialisasi Data
  useEffect(() => {
    if (!open) return;

    const url = API_URL ? `${API_URL}/project` : 'http://localhost:3000/project';

    fetch(url, { headers: { 'Content-Type': 'application/json' } })
    .then(r => r.json())
    .then(d => {
      if (Array.isArray(d)) setExistingNames(d.filter(p => p.id !== project?.id).map(p => p.name.toLowerCase()));
    });

    if (project) {
      const currentCycle = project.cycle || 1;
      const ph = project.sdlcPhases?.find((p: any) => 
        p.phaseName === project.currentPhase && p.cycle === currentCycle
      );
      
      const ps = fmtDate(project.projectStartDate) || getToday();
      const pd = fmtDate(project.projectDeadline) || calcDate(ps, 2, 'M');
      
      const phs = fmtDate(ph?.startDate) || ps;
      let phd = fmtDate(ph?.deadline);
      if (!phd || (phd === pd && phd !== calcDate(phs, 7, 'D'))) phd = calcDate(phs, 7, 'D');

      let initialStatus = ph?.status || project.status || "on-track";
      if (!STATUS_OPTIONS.includes(initialStatus)) initialStatus = "on-track";

      setForm({ 
        name: project.name || "", 
        pic: project.pic || "", 
        currentPhase: project.currentPhase || "Requirement", 
        status: initialStatus, 
        phaseStatus: initialStatus, 
        overallProgress: String(project.overallProgress || "0"), 
        projectStartDate: ps, 
        projectDeadline: pd, 
        phaseStartDate: phs, 
        phaseDeadline: phd 
      });
      setErrs({});
    }
  }, [open, project]);

  // 2. Validasi Real-time
  useEffect(() => {
    const e: Record<string, string> = {};
    const { name, projectStartDate: ps, projectDeadline: pd, phaseStartDate: phs, phaseDeadline: phd } = form;
    
    if (name && existingNames.includes(name.trim().toLowerCase())) e.name = "Name used.";
    if (ps && pd && new Date(ps) > new Date(pd)) e.dates = "Invalid project deadline.";
    if (phs && phd && new Date(phs) > new Date(phd)) e.ph = "Invalid phase deadline.";
    if (ps && phs && new Date(phs) < new Date(ps)) e.ph = "Phase starts before project.";
    
    setErrs(e);
  }, [form, existingNames]);

  // 3. Logic Handlers
  const handleChange = (k: string, v: string) => {
    setForm(p => {
      const n = { ...p, [k]: v };
      
      if (k === "overallProgress") {
        const prog = parseInt(v);
        if (prog === 100) {
          n.status = (p.status === "overdue" || p.status === "at-risk") ? p.status : "on-track";
          n.phaseStatus = n.status;
        } else if (prog === 0) {
          n.phaseStatus = "pending";
        } else {
          if (p.phaseStatus === "pending") n.phaseStatus = "on-track";
        }
      }

      if (k === "status") n.phaseStatus = v;

      if (k === "projectStartDate") { 
        n.projectDeadline = calcDate(v, 2, 'M'); 
        if (p.currentPhase === "Requirement") { 
          n.phaseStartDate = v; 
          n.phaseDeadline = calcDate(v, 7, 'D'); 
        } 
      }
      
      if (k === "currentPhase" && v !== p.currentPhase) { 
        if (v === "Requirement") {
             const today = getToday();
             n.projectStartDate = today;
             n.projectDeadline = calcDate(today, 2, 'M');
             n.phaseStartDate = today;
             n.phaseDeadline = calcDate(today, 7, 'D');
             n.overallProgress = "0";
             n.status = "on-track";
             n.phaseStatus = "in-progress";
        } else {
             const s = p.phaseDeadline || getToday(); 
             n.phaseStartDate = s; 
             n.phaseDeadline = calcDate(s, 7, 'D'); 
        }
      }
      
      if (k === "phaseStartDate") n.phaseDeadline = calcDate(v, 7, 'D');
      
      return n;
    });
  };

  /**
   * ✅ FUNGSI SUBMIT
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); 
    if (Object.keys(errs).length) return;
    setIsLoading(true);

    try {
      // 1. Ambil Identitas Real User
      const realUserId = getUserIdFromToken();

      // 2. Data Cleaning (Convert types)
      const dates = ['projectStartDate', 'projectDeadline', 'phaseStartDate', 'phaseDeadline'].reduce((a, k) => ({ 
        ...a, [k]: form[k as keyof typeof form] ? new Date(form[k as keyof typeof form]) : undefined 
      }), {});
      
      const payload = {
          ...form,
          overallProgress: Number(form.overallProgress),
          ...dates,
          updatedAt: new Date(),
          performedBy: realUserId // <--- TITIP ID USER
      };

      const url = API_URL ? `${API_URL}/project/${project.id}` : `http://localhost:3000/project/${project.id}`;

      const res = await fetch(url, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) throw new Error("Update failed on server");

      onOpenChange(false); 
      onProjectUpdated();
    } catch (err: any) { 
      console.error(err);
      alert("Failed update: " + err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const inputCls = (err?: string) => `bg-gray-50/30 ${err ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-[#36A39D]"}`;
  const ErrMsg = ({ m }: { m?: string }) => m ? <p className="text-xs text-red-500 font-medium flex gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {m}</p> : null;

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'on-track': return 'text-[#36A39D]';
      case 'overdue': return 'text-red-600';
      case 'at-risk': return 'text-[#F9AD3C]';
      default: return 'text-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white p-0 border-none shadow-2xl rounded-2xl">
        <div className="bg-white border-b border-gray-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-[#36A39D]/10 rounded-xl text-[#36A39D]"><FolderEdit className="h-6 w-6" /></div>
          <div className="text-left">
            <DialogTitle className="text-xl font-bold text-gray-900">Edit Project: {project?.id}</DialogTitle>
            <DialogDescription>Manage project timeline & status.</DialogDescription>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-left">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Project Name</Label>
              <Input value={form.name} onChange={e => handleChange("name", e.target.value)} className={inputCls(errs.name)} />
              <ErrMsg m={errs.name} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex gap-2"><User className="w-3.5 h-3.5"/> PIC</Label>
              <Input value={form.pic} onChange={e => handleChange("pic", e.target.value)} className="focus-visible:ring-[#36A39D]" />
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-5 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#36A39D]"></div>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#36A39D]" /><h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Phase Management</h4></div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm">
                    <Label className="text-xs font-bold text-gray-500 uppercase mr-1 whitespace-nowrap">Status:</Label>
                    <Select value={form.phaseStatus} onValueChange={v => handleChange("status", v)}>
                        <SelectTrigger className={`h-7 w-auto min-w-[110px] border-none text-xs font-bold uppercase focus:ring-0 px-0 text-right capitalize ${getStatusColor(form.phaseStatus)}`}>
                          <SelectValue>{fmtStatus(form.phaseStatus)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white z-[9999]">
                            {STATUS_OPTIONS.map(opt => (
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
                          <SelectContent className="bg-white z-[9999]">{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between"><Label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><BarChart3 className="w-3 h-3"/> Completion</Label><span className="text-xs font-bold text-[#F9AD3C] bg-white border border-[#F9AD3C]/30 px-2 py-0.5 rounded">{form.overallProgress}%</span></div>
                        <Input type="range" min="0" max="100" step="5" value={form.overallProgress} onChange={e => handleChange("overallProgress", e.target.value)} className="cursor-pointer accent-[#F9AD3C] h-2 bg-white rounded-lg appearance-none p-0 border border-slate-300" />
                      </div>
                 </div>
                 <div className={`space-y-3 p-3 rounded-lg border ${errs.ph ? "border-red-200 bg-red-50" : "border-slate-200 bg-white/60"}`}>
                    {[{l:"Start",v:form.phaseStartDate,k:"phaseStartDate",i:PlayCircle},{l:"End",v:form.phaseDeadline,k:"phaseDeadline",i:AlertCircle}].map((f, i) => (
                      <div key={i} className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><f.i className="w-3 h-3"/> {f.l}</Label>
                        <Input type="date" value={f.v} onChange={e => handleChange(f.k, e.target.value)} className="h-8 text-xs bg-white focus-visible:ring-[#36A39D]" />
                      </div>
                    ))}
                    <ErrMsg m={errs.ph} />
                 </div>
             </div>
          </div>

          <div className={`grid grid-cols-2 gap-5 pt-4 border-t border-gray-100 ${errs.dates ? "p-2 bg-red-50 rounded-lg" : ""}`}>
             {[{l:"Project Start",v:form.projectStartDate,k: "projectStartDate"},{l:"Project Deadline",v:form.projectDeadline,k: "projectDeadline"}].map((f, i) => (
               <div key={i} className="space-y-2">
                 <Label className="text-xs font-bold text-gray-400 uppercase">{f.l}</Label>
                 <Input type="date" value={f.v} onChange={e => handleChange(f.k, e.target.value)} className="h-9 focus-visible:ring-[#36A39D]" />
               </div>
             ))}
             <div className="col-span-2"><ErrMsg m={errs.dates} /></div>
          </div>

          <div className="space-y-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
             <div className="flex justify-between items-center">
                 <Label className="text-sm font-bold text-gray-700">Global Project Status</Label>
                 <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Calculator className="w-3 h-3"/> Status Sync Active</span>
             </div>
             <Select value={form.status} onValueChange={v => handleChange("status", v)}>
              <SelectTrigger className="bg-white border-blue-200 h-10 focus:ring-[#36A39D] capitalize"><SelectValue>{fmtStatus(form.status)}</SelectValue></SelectTrigger>
              <SelectContent className="bg-white z-[9999]">
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{fmtStatus(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-gray-200">Cancel</Button>
            <Button type="submit" className="bg-[#36A39D] hover:bg-[#2b8580] text-white rounded-xl shadow-md font-bold transition-all px-8" disabled={isLoading || !!Object.keys(errs).length}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}