import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ShieldCheck, ChevronRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

// 🚀 1. Import komponen terstandarisasi
import { AuthLayout } from "../../components/layouts/AuthLayout";
import { DashboardInput } from "../../components/dashboard";
import { api } from "../../services/api";

const iconCls = "absolute left-3.5 top-3.5 h-4 w-4 text-gray-400";
const inputExtraCls = "pl-10";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Mengambil email dari URL parameter
  const email = searchParams.get("email");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [ui, setUi] = useState({ loading: false, error: "", success: false });

  // 🚀 2. Proteksi URL: Jika tidak ada email, tendang balik
  useEffect(() => {
    if (!email) {
      navigate("/login");
    }
  }, [email, navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "", success: false });

    if (form.password !== form.confirmPassword) {
      setUi({ loading: false, error: "Password konfirmasi tidak cocok!", success: false });
      return;
    }

    try {
      // 🚀 3. Gunakan API Service (Jauh lebih bersih)
      await api.post("/auth/reset-password", { email, password: form.password });

      setUi({ loading: false, error: "", success: true });
      
      // Auto-redirect setelah 3 detik
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setUi({ loading: false, error: err.message || "Gagal memperbarui password.", success: false });
    }
  };

  // 🚀 4. Dinamis Layout Title berdasarkan state Success
  const layoutTitle = ui.success ? "Password Updated!" : "New Password";
  const layoutSubtitle = ui.success 
    ? "Redirecting you to login page..." 
    : `Resetting account for: ${email}`;

  return (
    <AuthLayout title={layoutTitle} subtitle={layoutSubtitle}>
      {ui.success ? (
        /* --- TAMPILAN SUKSES --- */
        <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-[#36A39D] animate-bounce" />
          </div>
          <p className="text-gray-500 font-medium">
            Your password has been changed successfully. <br />
            Please wait while we redirect you.
          </p>
        </div>
      ) : (
        /* --- TAMPILAN FORM --- */
        <form onSubmit={handleReset} className="space-y-5 animate-in fade-in duration-300">
          <div className="space-y-2 text-left relative">
            <Label htmlFor="password" title="New Password" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">New Password</Label>
            <div className="relative">
              <Lock className={iconCls} />
              <DashboardInput 
                id="password" 
                type="password" 
                placeholder="Enter new password" 
                className={inputExtraCls}
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
                required 
              />
            </div>
          </div>

          <div className="space-y-2 text-left relative">
            <Label htmlFor="confirmPassword" title="Confirm New Password" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Confirm New Password</Label>
            <div className="relative">
              <ShieldCheck className={iconCls} />
              <DashboardInput 
                id="confirmPassword" 
                type="password" 
                placeholder="Confirm new password" 
                className={inputExtraCls}
                value={form.confirmPassword} 
                onChange={(e) => setForm({...form, confirmPassword: e.target.value})} 
                required 
              />
            </div>
          </div>

          {ui.error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-in fade-in flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ui.error}</span>
            </div>
          )}

          <Button type="submit" className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-xl shadow-lg shadow-[#36A39D]/20 mt-4 transition-all active:scale-[0.98]" disabled={ui.loading}>
            {ui.loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
            ) : (
              <>Update Password <ChevronRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}