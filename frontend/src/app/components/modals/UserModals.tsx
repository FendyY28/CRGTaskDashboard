import { useState, useEffect, type FormEvent } from "react";
import { User as UserIcon, Loader2, AlertCircle, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { useTranslation } from "react-i18next";
import { THEME } from "../../constants/projectConstants"; 
import { api } from "../../services/api"; 

// Interfaces

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitAction: (payload: any) => Promise<void>;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: any;
  onSubmitAction: (id: string, payload: any) => Promise<void>;
}

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  variant?: "danger" | "primary";
  onConfirm: () => Promise<void>;
}

const inputClass = `h-10 bg-gray-50/50 border-gray-200 focus-visible:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[${THEME.TOSCA}] transition-all duration-300`;

// 1. ADD USER MODAL (PASSWORD DEFAULT OTOMATIS)
const INITIAL_FORM = { name: "", email: "", role: "OFFICER" };

export function AddUserModal({ open, onOpenChange, onSubmitAction }: AddUserModalProps) {
  const { t } = useTranslation();
  
  const [form, setForm] = useState(INITIAL_FORM);
  const [ui, setUi] = useState({ loading: false, error: "" });

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setUi({ loading: false, error: "" });
    }
  }, [open]);

  const updateForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    if (ui.error) setUi(prev => ({ ...prev, error: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "" });

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        throw new Error(t('admin.userManagement.modal.errorInvalidEmail', 'Format email tidak valid!'));
      }

      try {
        await api.post("/auth/validate-email", { email: form.email });
      } catch (apiErr: any) {
        throw new Error(apiErr.response?.data?.message || t('admin.userManagement.modal.errorEmailTaken', 'Email sudah terdaftar atau tidak valid'));
      }

      // Sisipkan password default
      const payload = { ...form, password: "Bsi12345!" };
      await onSubmitAction(payload);
      onOpenChange(false);
      
    } catch (err: any) {
      setUi({ loading: false, error: err.message || t('admin.userManagement.modal.errorDefault', 'Terjadi kesalahan') });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
        <div className="bg-gray-50/80 border-b border-gray-100 p-6">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserIcon style={{ color: THEME.TOSCA }} className="h-5 w-5" /> {t('admin.userManagement.modal.title', 'Buat Akun Baru')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('admin.userManagement.modal.desc', 'Buat kredensial untuk anggota tim baru.')}
          </DialogDescription>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {ui.error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" /> 
              <span>{ui.error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-gray-700">{t('admin.userManagement.modal.nameLabel', 'Nama Lengkap')}</Label>
            <Input id="name" required value={form.name} onChange={updateForm} className={inputClass} disabled={ui.loading} />
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-700">{t('admin.userManagement.modal.emailLabel', 'Email')}</Label>
            <Input id="email" type="email" required value={form.email} onChange={updateForm} className={inputClass} disabled={ui.loading} />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">{t('admin.userManagement.modal.roleLabel', 'Role Akses')}</Label>
            <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})} disabled={ui.loading}>
              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="HEAD">HEAD</SelectItem>
                <SelectItem value="OFFICER">OFFICER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <span className="font-bold">{t('admin.userManagement.modal.securityInfo', 'Info Keamanan:')}</span> {t('admin.userManagement.modal.defaultPwdText', 'Password akun ini akan diatur ke default')} <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold">Bsi12345!</code>. {t('admin.userManagement.modal.pwdRequirement', 'Pengguna diwajibkan mengganti password setelah login.')}
            </div>
          </div>

          <DialogFooter className="pt-4 mt-2 border-t border-gray-50">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={ui.loading}>
              {t('admin.userManagement.modal.cancel', 'Batal')}
            </Button>
            <Button type="submit" disabled={ui.loading} style={{ backgroundColor: THEME.TOSCA }} className="text-white hover:brightness-95 rounded-xl px-6 transition-all">
              {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {t('admin.userManagement.modal.saving', 'Processing...')}</> : t('admin.userManagement.modal.save', 'Simpan Akun')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 2. EDIT USER MODAL
export function EditUserModal({ open, onOpenChange, userData, onSubmitAction }: EditUserModalProps) {
  const { t } = useTranslation();
  const [ui, setUi] = useState({ loading: false, error: "" });
  const [form, setForm] = useState({ name: "", email: "", role: "OFFICER" });

  useEffect(() => {
    if (userData && open) {
      setForm({
        name: userData.name || "",
        email: userData.email || "",
        role: userData.role === "ADMIN" ? "OFFICER" : (userData.role || "OFFICER")
      });
      setUi({ loading: false, error: "" });
    }
  }, [userData, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "" });
    
    try {
      await onSubmitAction(userData.id, form);
      onOpenChange(false);
    } catch (err: any) {
      setUi({ loading: false, error: err.message || t('admin.userManagement.modal.errorDefault', 'Terjadi kesalahan') });
    }
  };

  if (!userData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
        <div className="bg-gray-50/80 border-b border-gray-100 p-6">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Pencil style={{ color: THEME.TOSCA }} className="h-5 w-5" /> {t('admin.userManagement.modal.editTitle', 'Edit Profil Pengguna')}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t('admin.userManagement.modal.editDesc', 'Ubah informasi dasar dan hak akses pengguna ini.')}
          </DialogDescription>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {ui.error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" /> 
              <span>{ui.error}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label className="text-gray-700">{t('admin.userManagement.modal.nameLabel', 'Nama Lengkap')}</Label>
            <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} disabled={ui.loading} />
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-700">{t('admin.userManagement.modal.emailLabel', 'Email')}</Label>
            <Input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputClass} disabled={ui.loading} />
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-700">{t('admin.userManagement.modal.roleLabel', 'Role Akses')}</Label>
            <Select value={form.role} onValueChange={v => setForm({...form, role: v})} disabled={ui.loading}>
              <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="HEAD">HEAD</SelectItem>
                <SelectItem value="OFFICER">OFFICER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="pt-4 mt-2 border-t border-gray-50">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={ui.loading}>
              {t('admin.userManagement.modal.cancel', 'Batal')}
            </Button>
            <Button type="submit" disabled={ui.loading} style={{ backgroundColor: THEME.TOSCA }} className="text-white hover:brightness-95 rounded-xl px-6 transition-all">
              {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {t('admin.userManagement.modal.saving', 'Processing...')}</> : t('admin.userManagement.modal.saveChanges', 'Simpan Perubahan')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 3. CONFIRM ACTION MODAL
export function ConfirmActionModal({ open, onOpenChange, title, description, actionLabel, variant = "danger", onConfirm }: ConfirmActionModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try { 
      await onConfirm(); 
      onOpenChange(false); 
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const isDanger = variant === "danger";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white p-6 border-none shadow-2xl rounded-3xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div 
            className={`h-16 w-16 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-50' : ''}`}
            style={!isDanger ? { backgroundColor: `${THEME.TOSCA}1A` } : {}}
          >
            <AlertTriangle 
              className={`h-8 w-8 ${isDanger ? 'text-red-600' : ''}`} 
              style={!isDanger ? { color: THEME.TOSCA } : {}} 
            />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">{description}</DialogDescription>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 w-full sm:justify-center mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl" disabled={isLoading}>
            {t('admin.userManagement.modal.cancel', 'Batal')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading} 
            className={`flex-1 rounded-xl shadow-md transition-all ${isDanger ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-white hover:brightness-95'}`}
            style={!isDanger ? { backgroundColor: THEME.TOSCA } : {}}
          >
            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}