import { useState, useEffect, type FormEvent } from "react";
import { User, Lock, Save, Loader2, Mail, ShieldCheck, KeyRound, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner"; 
import { api } from "../../services/api";

import { THEME } from "../../constants/projectConstants";

export function ProfileSettingsPage() {
  const { t, i18n } = useTranslation();
  
  const currentUser = { 
    name: localStorage.getItem("user_name") || "", 
    email: localStorage.getItem("user_email") || "", 
    role: localStorage.getItem("user_role") || "OFFICER",
    passwordChangedAt: localStorage.getItem("password_changed_at") || new Date().toISOString()
  };
  
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);

  const [passwordTimer, setPasswordTimer] = useState({
    daysLeft: 180,
    isWarning: false,
    expiryDateLabel: ""
  });

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name,
        email: currentUser.email
      });
    }

    const calculatePasswordExpiry = () => {
      const lastChanged = new Date(currentUser.passwordChangedAt);
      const expiryDate = new Date(lastChanged);
      expiryDate.setDate(expiryDate.getDate() + 180); 

      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const finalDays = diffDays > 0 ? diffDays : 0;
      
      setPasswordTimer({
        daysLeft: finalDays,
        isWarning: finalDays <= 7,
        expiryDateLabel: expiryDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      });
    };

    calculatePasswordExpiry();
  }, [currentUser.passwordChangedAt, i18n.language]); 

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      localStorage.setItem("user_name", profileForm.name);
      toast.success(t('settings.profile.alerts.successProfile'));
      setTimeout(() => window.location.reload(), 1000); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('settings.profile.alerts.errorUpdate'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error(t('settings.profile.alerts.fillPasswordFirst'));
      return;
    }

    setIsRequestingOtp(true);
    try {
      const res = await api.post('/auth/request-change-password-otp');
      toast.success(res.data?.message || t('settings.profile.alerts.otpSent'));
      setShowOtpField(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('settings.profile.alerts.otpError'));
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('settings.profile.alerts.passwordMismatch'));
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*~^%()_+\-={}[\]|:;"'<>,.?/]).{6,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      toast.error(t('settings.profile.alerts.passwordWeak'));
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.patch('/auth/change-password', {
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        otp: passwordForm.otp
      });

      toast.success(t('settings.profile.alerts.passwordSuccess'));
      localStorage.setItem("password_changed_at", new Date().toISOString());

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setShowOtpField(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('settings.profile.alerts.passwordError'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const inputClass = `h-11 bg-gray-50/50 border-gray-200 focus-visible:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[${THEME.TOSCA}] transition-all duration-300 rounded-xl`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <User style={{ color: THEME.TOSCA }} className="h-6 w-6" /> 
          {t('settings.profile.title')}
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          {t('settings.profile.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* 🔥 CARD TANPA ANIMASI PULSE */}
          <div 
            className={`p-6 rounded-3xl border shadow-sm flex items-center justify-between transition-all duration-500 ${
              passwordTimer.isWarning ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <div 
                style={!passwordTimer.isWarning ? { backgroundColor: `${THEME.TOSCA}1A`, color: THEME.TOSCA } : {}}
                className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                  passwordTimer.isWarning ? 'bg-red-500 text-white shadow-lg shadow-red-200' : ''
                }`}
              >
                {passwordTimer.isWarning ? <AlertTriangle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t('settings.profile.expiryLabel', 'Masa Berlaku Password')}
                </p>
                <h4 className={`text-xl font-black leading-none mt-1 ${passwordTimer.isWarning ? 'text-red-600' : 'text-gray-800'}`}>
                  {passwordTimer.daysLeft} {t('settings.profile.daysRemaining', 'Hari Lagi')}
                </h4>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                {t('settings.profile.untilDate', 'Hingga Tanggal')}
              </p>
              <p className="text-sm font-bold text-gray-600">{passwordTimer.expiryDateLabel}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
              style={{ backgroundColor: `${THEME.TOSCA}08`, borderBottomColor: `${THEME.TOSCA}1A` }}
              className="border-b p-6 flex items-center gap-3"
            >
              <div style={{ backgroundColor: `${THEME.TOSCA}1A` }} className="h-10 w-10 rounded-full flex items-center justify-center">
                <Mail style={{ color: THEME.TOSCA }} className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('settings.profile.personalInfo')}</h3>
                <p className="text-xs text-gray-500">{t('settings.profile.personalInfoDesc')}</p>
              </div>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">{t('settings.profile.nameLabel')}</Label>
                <Input required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">{t('settings.profile.emailLabel')}</Label>
                <Input type="email" value={profileForm.email} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                <p className="text-[11px] text-gray-400 mt-1">{t('settings.profile.emailHelper')}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">{t('settings.profile.roleLabel')}</Label>
                <Input 
                  value={currentUser.role} 
                  disabled 
                  style={{ color: THEME.TOSCA }}
                  className={`${inputClass} opacity-60 cursor-not-allowed font-bold`} 
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSavingProfile} 
                  style={{ backgroundColor: THEME.TOSCA }}
                  className="hover:brightness-95 text-white rounded-xl px-6 shadow-md transition-all h-11"
                >
                  {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  {t('settings.profile.saveBtn')}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
             <div className="bg-amber-50/50 border-b border-amber-100 p-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-md font-bold text-gray-900">{t('settings.profile.security')}</h3>
                <p className="text-[11px] text-gray-500 leading-tight">{t('settings.profile.securityDesc')}</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-700 font-semibold">{t('settings.profile.currentPwd')}</Label>
                <Input type="password" required value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} className="h-10 text-sm bg-gray-50/50 rounded-lg focus-visible:ring-0 focus-visible:border-amber-500" disabled={isSavingPassword} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-700 font-semibold">{t('settings.profile.newPwd')}</Label>
                <Input type="password" required value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} className="h-10 text-sm bg-gray-50/50 rounded-lg focus-visible:ring-0 focus-visible:border-amber-500" disabled={isSavingPassword} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-700 font-semibold">{t('settings.profile.confirmPwd')}</Label>
                <Input type="password" required value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="h-10 text-sm bg-gray-50/50 rounded-lg focus-visible:ring-0 focus-visible:border-amber-500" disabled={isSavingPassword} />
              </div>

              <div className="pt-2">
                {!showOtpField ? (
                  <Button 
                    type="button" 
                    onClick={handleRequestOtp} 
                    disabled={isRequestingOtp}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-all h-11 text-sm font-bold"
                  >
                    {isRequestingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4" />}
                    {t('settings.profile.requestOtpBtn', 'Minta Kode OTP')}
                  </Button>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div 
                      style={{ backgroundColor: `${THEME.TOSCA}08`, borderColor: `${THEME.TOSCA}33` }}
                      className="space-y-1.5 p-3 border rounded-xl"
                    >
                      <Label style={{ color: THEME.TOSCA }} className="text-xs font-bold">{t('settings.profile.otpLabel', 'Kode OTP Email')}</Label>
                      <Input 
                        placeholder="6 Digit OTP" 
                        required 
                        value={passwordForm.otp} 
                        onChange={e => setPasswordForm({...passwordForm, otp: e.target.value})} 
                        style={{ borderColor: THEME.TOSCA }}
                        className="h-10 text-center text-lg font-black tracking-[0.5em] bg-white rounded-lg focus-visible:ring-0" 
                        maxLength={6}
                      />
                    </div>
                    <Button type="submit" disabled={isSavingPassword} className="w-full bg-gray-900 hover:bg-black text-white rounded-xl shadow-lg transition-all h-11 text-sm font-bold">
                      {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}
                      {t('settings.profile.confirmChangeBtn', 'Konfirmasi Perubahan')}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}