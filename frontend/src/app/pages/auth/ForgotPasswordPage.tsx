import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ChevronRight, Loader2, ArrowLeft, ShieldCheck, AlertCircle, KeyRound, Lock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

import { AuthLayout } from "../../components/layouts/AuthLayout";
import { DashboardInput } from "../../components/dashboard";
import { api } from "../../services/api"; 
import { THEME } from "../../constants/projectConstants"; 

export function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP & New Password, 3: Success
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [ui, setUi] = useState({ loading: false, error: "" });

  // STEP 1: REQUEST OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "" });

    try {
      await api.post("/auth/forgot-password", { email: formData.email });
      setStep(2); 
    } catch (err: any) {
      setUi({ loading: false, error: err.response?.data?.message || err.message || "Gagal mengirim OTP." });
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  // STEP 2: VERIFY OTP & RESET PASSWORD
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "" });

    if (formData.newPassword !== formData.confirmPassword) {
      setUi({ loading: false, error: "Password baru dan konfirmasi tidak cocok!" });
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*~^%()_+\-={}[\]|:;"'<>,.?/]).{6,}$/;
    if (!passwordRegex.test(formData.newPassword)) {
      setUi({ loading: false, error: "Password minimal 6 karakter, ada huruf besar & simbol." });
      return;
    }

    try {
      await api.post("/auth/reset-password", { 
        email: formData.email,
        otp: formData.otp,
        password: formData.newPassword
      });
      setStep(3); 
    } catch (err: any) {
      setUi({ loading: false, error: err.response?.data?.message || "Kode OTP salah atau kedaluwarsa." });
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  const layoutTitles = {
    1: "Reset Password",
    2: "Verify & Create Password",
    3: "Password Changed"
  };
  
  const layoutSubtitles = {
    1: "Enter your work email to receive an OTP code.",
    2: `We sent a 6-digit code to ${formData.email}`,
    3: "Your password has been successfully reset."
  };

  return (
    <AuthLayout title={layoutTitles[step]} subtitle={layoutSubtitles[step]}>
      
      {/* TAHAP 1: INPUT EMAIL */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2 text-left relative">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Work Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <DashboardInput 
                id="email" type="email" placeholder="name@bankbsi.id" 
                className="pl-10" required disabled={ui.loading}
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
          </div>

          {ui.error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-in fade-in flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ui.error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full text-white h-12 text-sm font-bold rounded-xl shadow-lg mt-4 transition-all active:scale-[0.98]" 
            disabled={ui.loading || !formData.email}
            style={{ 
                backgroundColor: THEME.TOSCA,
                boxShadow: `0 10px 15px -3px ${THEME.TOSCA}33` 
            }}
          >
            {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <>Send OTP Code <ChevronRight className="ml-1 h-4 w-4" /></>}
          </Button>

          <div className="text-center pt-2">
            <Link 
                to="/login" 
                className="inline-flex items-center text-xs text-gray-400 font-bold transition-colors group"
                onMouseOver={(e) => (e.currentTarget.style.color = THEME.TOSCA)}
                onMouseOut={(e) => (e.currentTarget.style.color = '')}
            >
              <ArrowLeft className="mr-2 h-3 w-3 transition-transform group-hover:-translate-x-1" />
              Back to Login
            </Link>
          </div>
        </form>
      )}

      {/* TAHAP 2: INPUT OTP & PASSWORD BARU  */}
      {step === 2 && (
        <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
          
          <div className="space-y-2 text-left">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1" style={{ color: THEME.TOSCA }}>6-Digit OTP Code</Label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: THEME.TOSCA }} />
              <DashboardInput 
                type="text" maxLength={6} placeholder="••••••" required disabled={ui.loading}
                className="pl-10 font-black tracking-[0.5em] text-center" 
                style={{ borderColor: `${THEME.TOSCA}4D` }}
                value={formData.otp} onChange={(e) => setFormData({...formData, otp: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <DashboardInput 
                type="password" placeholder="••••••••" required disabled={ui.loading} 
                className="pl-10"
                value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <DashboardInput 
                type="password" placeholder="••••••••" required disabled={ui.loading} 
                className="pl-10"
                value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
              />
            </div>
          </div>

          {ui.error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-in fade-in flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ui.error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full text-white h-12 text-sm font-bold rounded-xl shadow-lg mt-2 transition-all active:scale-[0.98]" 
            disabled={ui.loading || !formData.otp || !formData.newPassword}
            style={{ 
                backgroundColor: THEME.TOSCA,
                boxShadow: `0 10px 15px -3px ${THEME.TOSCA}33` 
            }}
          >
            {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : <>Reset Password</>}
          </Button>

          <div className="text-center pt-2">
            <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="text-xs text-gray-400 font-bold transition-colors"
                onMouseOver={(e) => (e.currentTarget.style.color = THEME.TOSCA)}
                onMouseOut={(e) => (e.currentTarget.style.color = '')}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* TAHAP 3: SUKSES */}
      {step === 3 && (
        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div 
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center border"
            style={{ backgroundColor: `${THEME.TOSCA}1A`, borderColor: `${THEME.TOSCA}33` }}
          >
            <ShieldCheck className="h-10 w-10" style={{ color: THEME.TOSCA }} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              You can now use your new password to log in to the CRG Dashboard.
            </p>
          </div>
          <Button 
            asChild 
            className="w-full text-white font-bold rounded-xl h-12 shadow-lg"
            style={{ 
                backgroundColor: THEME.TOSCA,
                boxShadow: `0 10px 15px -3px ${THEME.TOSCA}33` 
            }}
          >
            <Link to="/login">Proceed to Login</Link>
          </Button>
        </div>
      )}

    </AuthLayout>
  );
}