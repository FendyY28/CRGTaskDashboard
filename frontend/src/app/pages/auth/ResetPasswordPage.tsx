import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ShieldCheck, ChevronRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// UI Components
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { AuthLayout } from "../../components/layouts/AuthLayout";
import { DashboardInput } from "../../components/dashboard";

// Utils & Services
import { api } from "../../services/api";
import { THEME } from "../../constants/projectConstants";

const iconCls = "absolute left-3.5 top-3.5 h-4 w-4 text-gray-400";
const inputExtraCls = "pl-10";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Mengambil email dari URL parameter
  const email = searchParams.get("email");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [ui, setUi] = useState({ loading: false, error: "", success: false });

  // Proteksi URL: Jika tidak ada email, tendang balik ke login
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
      // Hit endpoint reset-password
      await api.post("/auth/reset-password", { email, password: form.password });

      setUi({ loading: false, error: "", success: true });
      
      // Auto-redirect setelah 3 detik
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setUi({ 
        loading: false, 
        error: err.response?.data?.message || "Gagal memperbarui password.", 
        success: false 
      });
    }
  };

  // Dinamis Layout Title & Subtitle berdasarkan state Success
  const layoutTitle = ui.success ? "Password Updated!" : "New Password";
  const layoutSubtitle = ui.success 
    ? "Redirecting you to login page..." 
    : `Resetting account for: ${email}`;

  return (
    <AuthLayout title={layoutTitle} subtitle={layoutSubtitle}>
      {ui.success ? (
        /* TAMPILAN SUKSES */
        <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
          <div 
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${THEME.TOSCA}15` }} 
          >
            <CheckCircle2 className="h-10 w-10 animate-bounce" style={{ color: THEME.TOSCA }} />
          </div>
          <p className="text-gray-500 font-medium">
            Your password has been changed successfully. <br />
            Please wait while we redirect you.
          </p>
        </div>
      ) : (
        /* TAMPILAN FORM */
        <form onSubmit={handleReset} className="space-y-5 animate-in fade-in duration-300">
          
          {/* Input Password Baru */}
          <div className="space-y-2 text-left relative">
            <Label 
              htmlFor="password" 
              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1"
            >
              New Password
            </Label>
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

          {/* Input Konfirmasi Password */}
          <div className="space-y-2 text-left relative">
            <Label 
              htmlFor="confirmPassword" 
              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1"
            >
              Confirm New Password
            </Label>
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

          {/* Alert Error */}
          {ui.error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold animate-in fade-in flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ui.error}</span>
            </div>
          )}

          {/* Tombol Submit */}
          <Button 
            type="submit" 
            disabled={ui.loading}
            className="w-full text-white h-12 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4"
            style={{ 
              backgroundColor: THEME.TOSCA,
              boxShadow: `0 10px 15px -3px ${THEME.TOSCA}33` // Shadow dengan warna Tosca
            }}
            onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(0.9)')}
            onMouseOut={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            {ui.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Updating...
              </>
            ) : (
              <>
                Update Password 
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}