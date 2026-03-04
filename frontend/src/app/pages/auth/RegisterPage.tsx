import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Mail, ChevronRight, User, Loader2, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from "lucide-react"; 
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

import { AuthLayout } from "../../components/layouts/AuthLayout";
import { DashboardInput } from "../../components/dashboard";
import { api } from "../../services/api";

const iconCls = "absolute left-3.5 top-3.5 h-4 w-4 text-gray-400";
const inputExtraCls = "pl-10"; 

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  
  const [ui, setUi] = useState({ 
    loading: false, 
    error: "", 
    success: false,
    resendLoading: false 
  });

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    // FIX TYPE TIMER: Gunakan ReturnType bawaan TS agar tidak perlu 'any'
    let timer: ReturnType<typeof setInterval>; 

    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [cooldown]);

  const updateForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    if (ui.error) setUi(prev => ({ ...prev, error: "" }));
  };

  // Logic API menggunakan Service (Sangat bersih!)
  const performRegister = async () => {
    return await api.post("/auth/register", {
      name: form.name,
      email: form.email,
      password: form.password
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi(prev => ({ ...prev, loading: true, error: "" }));

    if (form.password !== form.confirmPassword) {
      setUi(prev => ({ ...prev, loading: false, error: "Konfirmasi password tidak cocok!" }));
      return;
    }

    try {
      await performRegister();
      setUi(prev => ({ ...prev, success: true }));
      setCooldown(30); 
    } catch (err: any) {
      setUi(prev => ({ ...prev, error: err.message || "Registration failed" }));
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0) return; 

    setUi(prev => ({ ...prev, resendLoading: true, error: "" }));
    try {
      await performRegister(); 
      setCooldown(60); 
    } catch (err: any) {
      setUi(prev => ({ ...prev, error: err.message || "Gagal mengirim ulang email" }));
    } finally {
      setUi(prev => ({ ...prev, resendLoading: false }));
    }
  };

  const handleReset = () => {
    setUi(prev => ({ ...prev, success: false, error: "" }));
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    setCooldown(0); 
  };

  // Dinamis Layout Title & Subtitle berdasarkan state Success
  const layoutTitle = ui.success ? "Check Your Inbox!" : "Create Account";
  const layoutSubtitle = ui.success 
    ? "Verification required to continue." 
    : "Join CRG Monitoring Access Portal";

  return (
    // Bungkus dengan AuthLayout (Hanya ditulis 1 kali untuk kedua state!)
    <AuthLayout title={layoutTitle} subtitle={layoutSubtitle}>
      
      {ui.success ? (
        /* --- TAMPILAN SUKSES --- */
        <div className="text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center">
                <Mail className="h-10 w-10 text-[#36A39D] animate-pulse" />
            </div>
          </div>
          
          <p className="text-gray-500 mb-6 leading-relaxed text-sm">
            We have sent a verification link to <br />
            <span className="font-bold text-gray-900">{form.email}</span>. 
            <br/>Please verify your account before logging in.
          </p>

          {/* Menampilkan pesan error jika resend gagal */}
          {ui.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-in fade-in flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ui.error}</span>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleReset} className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 font-bold rounded-xl transition-all shadow-lg shadow-[#36A39D]/20">
              Back to Register <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={cooldown > 0 || ui.resendLoading}
              className={`w-full h-12 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:text-[#36A39D] transition-colors ${cooldown > 0 ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {ui.resendLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : cooldown > 0 ? (
                  <span className="flex items-center">Resend Email in {cooldown}s</span>
              ) : (
                  <span className="flex items-center"><RefreshCw className="mr-2 h-4 w-4" /> Resend Email</span>
              )}
            </Button>

            <p className="text-[11px] text-gray-400 font-medium pt-2 uppercase tracking-wider">
                Didn't receive email? Check spam or click Resend.
            </p>
          </div>
        </div>
      ) : (
        /* TAMPILAN FORM */
        <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in duration-300">
          <div className="space-y-2 text-left relative">
            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Full Name</Label>
            <div className="relative">
              <User className={iconCls} />
              <DashboardInput id="name" type="text" placeholder="Enter your full name" className={inputExtraCls} value={form.name} onChange={updateForm} disabled={ui.loading} required />
            </div>
          </div>

          <div className="space-y-2 text-left relative">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Work Email</Label>
            <div className="relative">
              <Mail className={iconCls} />
              <DashboardInput id="email" type="email" placeholder="name@bankbsi.id" className={inputExtraCls} value={form.email} onChange={updateForm} disabled={ui.loading} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 text-left relative">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Password</Label>
                  <div className="relative">
                      <Lock className={iconCls} />
                      <DashboardInput id="password" type="password" placeholder="••••••••" className={inputExtraCls} value={form.password} onChange={updateForm} disabled={ui.loading} required />
                  </div>
              </div>

              <div className="space-y-2 text-left relative">
                  <Label htmlFor="confirmPassword" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Confirm</Label>
                  <div className="relative">
                      <ShieldCheck className={iconCls} />
                      <DashboardInput id="confirmPassword" type="password" placeholder="••••••••" className={inputExtraCls} value={form.confirmPassword} onChange={updateForm} disabled={ui.loading} required />
                  </div>
              </div>
          </div>

          {ui.error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-in fade-in flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ui.error}</span>
            </div>
          )}

          <Button type="submit" className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-xl shadow-lg shadow-[#36A39D]/20 mt-4 transition-all active:scale-[0.98]" disabled={ui.loading}>
            {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <>Register Account <ChevronRight className="ml-1 h-4 w-4" /></>}
          </Button>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 font-medium">
              Already have an account?{" "}
              <Link to="/login" className="text-[#36A39D] font-bold hover:underline transition-colors">
                Login here
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}