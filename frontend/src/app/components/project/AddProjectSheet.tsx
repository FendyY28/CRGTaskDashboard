import { useState, useEffect, type FormEvent } from "react";
import { Plus, Loader2, FolderPlus, User, Hash, BarChart3, Calendar, Clock, AlertCircle, AlertTriangle, CheckCircle2, PlayCircle, Activity } from "lucide-react";
import { Button } from "../../components/ui/button"; 
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { API_URL } from "../../../lib/utils"; 

// 🔥 1. Import hook terjemahan
import { useTranslation } from "react-i18next";

// --- HELPERS ---
const getToday = () => new Date().toISOString().split('T')[0];
const calcDate = (date: string, amt: number, type: 'D' | 'M') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  type === 'M' ? d.setMonth(d.getMonth() + amt) : d.setDate(d.getDate() + amt);
  return d.toISOString().split('T')[0];
};

const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const backupEmail = localStorage.getItem('user_email');
    const backupName = localStorage.getItem('user_name');

    if (!token || token === "mock-jwt-token") {
      console.warn("⚠️ Token asli tidak ditemukan. Menggunakan email/nama sebagai identitas.");
      return backupEmail || backupName || null;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return backupEmail || backupName || null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const parsed = JSON.parse(jsonPayload);
    return parsed.id || parsed.sub || parsed.userId || parsed.email || backupEmail; 
  } catch (e) {
    return localStorage.getItem('user_email') || null;
  }
};

const INITIAL_FORM = {
  name: "", code: "", pic: "", currentPhase: "Requirement", status: "on-track", overallProgress: "0",
  startDate: getToday(), deadline: calcDate(getToday(), 2, 'M'),
  phaseStartDate: getToday(), phaseDeadline: calcDate(getToday(), 7, 'D')
};

const PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];

export function AddProjectSheet({ onProjectAdded }: { onProjectAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingData, setExistingData] = useState<{ names: string[], codes: string[] }>({ names: [], codes: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState<{ error?: string, success?: string }>({});
  const [formData, setFormData] = useState(INITIAL_FORM);

  // 🔥 2. Panggil hook
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    setStatusMsg({});
    setFormData({ ...INITIAL_FORM, startDate: getToday(), deadline: calcDate(getToday(), 2, 'M'), phaseStartDate: getToday(), phaseDeadline: calcDate(getToday(), 7, 'D') });
    
    const url = API_URL ? `${API_URL}/project` : 'http://localhost:3000/project';
    fetch(url, { headers: { 'Content-Type': 'application/json' } })
      .then(res => res.json())
      .then((data: any[]) => Array.isArray(data) && setExistingData({
        names: data.map(p => p.name.toLowerCase()),
        codes: data.map(p => p.id.toLowerCase())
      }))
      .catch(() => setStatusMsg({ error: "loadValidationFailed" })); // Simpan KEY-nya saja
  }, [open]);

  useEffect(() => {
    const errs: Record<string, string> = {};
    const { name, code, startDate: s, deadline: d, phaseStartDate: ps, phaseDeadline: pd } = formData;
    
    // Simpan KEY error-nya saja ke state agar bisa dilokalisasi saat render
    if (name && existingData.names.includes(name.trim().toLowerCase())) errs.name = "nameExists";
    if (code && existingData.codes.includes(code.trim().toLowerCase())) errs.code = "codeExists";
    if (s && d && new Date(s) > new Date(d)) errs.dates = "deadlineBeforeStart";
    if (ps && pd && new Date(ps) > new Date(pd)) errs.phaseDates = "phaseDeadlineBeforeStart";
    else if (s && ps && new Date(ps) < new Date(s)) errs.phaseDates = "phaseBeforeProject";
    
    setErrors(errs);
    setStatusMsg({});
  }, [formData, existingData]);

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      if (key === "overallProgress") next.status = value === "100" ? "completed" : "on-track";
      if (key === "startDate") {
        next.deadline = calcDate(value, 2, 'M');
        next.phaseStartDate = value;
        next.phaseDeadline = calcDate(value, 7, 'D');
      }
      if (key === "phaseStartDate") next.phaseDeadline = calcDate(value, 7, 'D'); 
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length) return;
    setIsLoading(true); setStatusMsg({});

    try {
      const url = API_URL ? `${API_URL}/project` : 'http://localhost:3000/project';
      const realUserId = getUserIdFromToken();

      const payload = {
        ...formData,
        overallProgress: Number(formData.overallProgress), 
        startDate: new Date(formData.startDate),
        deadline: new Date(formData.deadline),
        phaseStartDate: new Date(formData.phaseStartDate),
        phaseDeadline: new Date(formData.phaseDeadline),
        code: formData.code.trim() === "" ? undefined : formData.code,
        performedBy: realUserId 
      };

      const res = await fetch(url, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
      });
      
      const responseData = await res.json();
      if (!res.ok) throw new Error("saveFailed"); // Lempar KEY error

      setStatusMsg({ success: "created" }); // Simpan KEY success
      onProjectAdded?.();
      setTimeout(() => setOpen(false), 1200);
    } catch (err: any) {
      console.error("Submit Error:", err);
      // Jika pesan error berasal dari server kita abaikan, jika tidak kita pakai key
      setStatusMsg({ error: err.message === "saveFailed" ? "saveFailed" : "systemError" });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (err?: string) => `h-10 border-gray-200 ${err ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-[#36A39D]"}`;
  
  // Terjemahkan pesan error di sini
  const ErrorMsg = ({ msgKey }: { msgKey?: string }) => msgKey ? <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium text-left"><AlertCircle className="h-3 w-3" /> {t(`addProject.errors.${msgKey}`)}</p> : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#36A39D] hover:bg-[#2b8580] text-white font-bold gap-2 px-6 rounded-xl shadow-md shadow-[#36A39D]/20 transition-all hover:scale-[1.02]">
          <Plus className="h-5 w-5" /> {t('addProject.triggerBtn')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] bg-white p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
        <div className="bg-white border-b border-gray-100 p-6 flex items-start gap-4">
          <div className="p-3 bg-[#36A39D]/10 rounded-xl text-[#36A39D]"><FolderPlus className="h-6 w-6" /></div>
          <div className="text-left">
            <DialogTitle className="text-xl font-bold text-gray-900">{t('addProject.title')}</DialogTitle>
            <DialogDescription>{t('addProject.description')}</DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left overflow-y-auto max-h-[80vh]">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">{t('addProject.labels.projectName')}</Label>
            <Input id="name" required value={formData.name} onChange={e => handleChange("name", e.target.value)} placeholder={t('addProject.placeholders.projectName')} className={`h-11 bg-gray-50/30 ${inputClass(errors.name)}`} />
            <ErrorMsg msgKey={errors.name} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-gray-400" /> {t('addProject.labels.projectCode')}</Label>
              <Input value={formData.code} onChange={e => handleChange("code", e.target.value)} placeholder={t('addProject.placeholders.projectCode')} className={inputClass(errors.code)} />
              <ErrorMsg msgKey={errors.code} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" /> {t('addProject.labels.picName')}</Label>
              <Input required value={formData.pic} onChange={e => handleChange("pic", e.target.value)} placeholder={t('addProject.placeholders.picName')} className={inputClass()} />
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-5 p-4 rounded-xl border ${errors.dates ? "bg-red-50 border-red-100" : "bg-blue-50/40 border-blue-100"}`}>
             {['startDate', 'deadline'].map((field, i) => (
                <div key={field} className="space-y-2">
                   <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      {i === 0 ? <Calendar className="h-3.5 w-3.5 text-blue-600"/> : <Clock className={`h-3.5 w-3.5 ${errors.dates ? "text-red-500" : "text-blue-600"}`} />} 
                      {i === 0 ? t('addProject.labels.projectStart') : t('addProject.labels.projectDeadline')}
                   </Label>
                   <Input type="date" required value={formData[field as keyof typeof formData]} onChange={e => handleChange(field as any, e.target.value)} className="bg-white border-blue-200 focus-visible:ring-blue-500" />
                </div>
             ))}
             <div className="col-span-2 mt-[-10px]"><ErrorMsg msgKey={errors.dates} /></div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#36A39D]"></div>
             <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#36A39D]" /><h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t('addProject.labels.initialPhaseSetup')}</h4></div>

             <div className="grid grid-cols-2 gap-5">
                 <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase">{t('addProject.labels.startingPhase')}</Label>
                    <Select value={formData.currentPhase} onValueChange={v => handleChange("currentPhase", v)}>
                      <SelectTrigger className="bg-white border-slate-300 h-9 font-medium focus:ring-[#36A39D]"><SelectValue /></SelectTrigger>
                      {/* Note: Phase names dibiarkan original karena standar SDLC */}
                      <SelectContent className="bg-white">{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between"><Label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><BarChart3 className="w-3 h-3"/> {t('addProject.labels.progress')}</Label><span className="text-xs font-bold text-[#F9AD3C] bg-white px-2 py-0.5 rounded border border-[#F9AD3C]/30">{formData.overallProgress}%</span></div>
                    <Input type="range" min="0" max="100" step="5" value={formData.overallProgress} onChange={e => handleChange("overallProgress", e.target.value)} className="cursor-pointer accent-[#F9AD3C] h-2 bg-white rounded-lg appearance-none p-0 border border-slate-300" />
                 </div>
             </div>

             <div className={`grid grid-cols-2 gap-5 p-2 rounded-md ${errors.phaseDates ? "bg-red-50/50 border border-red-100" : "bg-white/60 border border-slate-200"}`}>
                {['phaseStartDate', 'phaseDeadline'].map((field, i) => (
                   <div key={field} className="space-y-1">
                      <Label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          {i === 0 ? <PlayCircle className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>} {i === 0 ? t('addProject.labels.phaseStart') : t('addProject.labels.phaseDeadline')}
                      </Label>
                      <Input type="date" required value={formData[field as keyof typeof formData]} onChange={e => handleChange(field as any, e.target.value)} className="h-8 text-xs bg-white border-gray-200 focus-visible:ring-[#36A39D]" />
                   </div>
                ))}
                <div className="col-span-2 mt-[-5px]"><ErrorMsg msgKey={errors.phaseDates} /></div>
             </div>
          </div>

          <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">{t('addProject.labels.initialStatus')}</Label>
              <Select value={formData.status} onValueChange={v => handleChange("status", v)}>
                <SelectTrigger className="h-10 focus:ring-[#36A39D] border-gray-200 capitalize">
                    <SelectValue>{t(`addProject.statuses.${formData.status}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {["on-track", "at-risk", "overdue"].map(s => <SelectItem key={s} value={s} className="capitalize">{t(`addProject.statuses.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t border-gray-100 gap-4">
            <div className="flex-1 text-sm font-medium">
               {statusMsg.error && <div className="text-red-600 flex items-center gap-2 animate-pulse"><AlertTriangle className="h-4 w-4" /> {t(`addProject.errors.${statusMsg.error}`)}</div>}
               {statusMsg.success && <div className="text-[#36A39D] flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t(`addProject.success.${statusMsg.success}`)}</div>}
            </div>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-gray-200">{t('addProject.buttons.cancel')}</Button>
                <Button type="submit" className={`${Object.keys(errors).length ? "bg-gray-400 cursor-not-allowed" : "bg-[#36A39D] hover:bg-[#2b8580]"} text-white px-8 font-semibold shadow-md rounded-xl transition-all`} disabled={isLoading || !!Object.keys(errors).length || !!statusMsg.success}>
                   {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {t('addProject.buttons.saving')}</> : statusMsg.success ? t('addProject.buttons.saved') : t('addProject.buttons.submit')}
                </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}