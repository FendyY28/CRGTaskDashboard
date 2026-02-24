import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ChevronRight, Loader2, ArrowLeft, Send, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

// 🚀 1. Import Standarisasi Arsitektur
import { AuthLayout } from "../../components/layouts/AuthLayout";
import { DashboardInput } from "../../components/dashboard";
import { api } from "../../services/api"; 

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); 
  const [ui, setUi] = useState({ loading: false, error: "", success: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "", success: false });

    try {
      // 🚀 2. Gunakan API Service (Abstraksi fetch)
      await api.post("/auth/forgot-password", { email });

      // Jika berhasil
      setUi({ loading: false, error: "", success: true });
    } catch (err: any) {
      setUi({ loading: false, error: err.message || "Gagal mengirim email reset.", success: false });
    }
  };

  // 🚀 3. Dinamis Title & Subtitle untuk AuthLayout
  const layoutTitle = ui.success ? "Check your email" : "Reset Password";
  const layoutSubtitle = ui.success 
    ? "Instructions have been sent to your inbox." 
    : "Enter your work email to receive reset instructions.";

  return (
    <AuthLayout title={layoutTitle} subtitle={layoutSubtitle}>
      {ui.success ? (
        /* --- TAMPILAN SUKSES --- */
        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto w-20 h-20 bg-[#36A39D]/10 rounded-full flex items-center justify-center">
            <Send className="h-10 w-10 text-[#36A39D]" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              We have sent a password reset link to: <br />
              <span className="text-gray-900 font-bold">{email}</span>
            </p>
          </div>
          <Button asChild className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white font-bold rounded-xl h-12 shadow-lg shadow-[#36A39D]/20">
            <Link to="/login">Back to Login</Link>
          </Button>
          <button 
            onClick={() => setUi(prev => ({ ...prev, success: false }))}
            className="text-xs text-gray-400 font-bold hover:text-[#36A39D] transition-colors"
          >
            Didn't receive the email? Try again
          </button>
        </div>
      ) : (
        /* --- TAMPILAN FORM --- */
        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
          <div className="space-y-2 text-left relative">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Work Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <DashboardInput 
                id="email" 
                type="email" 
                placeholder="name@bankbsi.id" 
                className="pl-10" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled={ui.loading} 
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

          <Button 
            type="submit" 
            className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-xl shadow-lg shadow-[#36A39D]/20 mt-4 transition-all active:scale-[0.98]" 
            disabled={ui.loading || !email}
          >
            {ui.loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <>Send Reset Link <ChevronRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>

          <div className="text-center pt-2">
            <Link 
              to="/login" 
              className="inline-flex items-center text-xs text-gray-400 font-bold hover:text-[#36A39D] transition-colors group"
            >
              <ArrowLeft className="mr-2 h-3 w-3 transition-transform group-hover:-translate-x-1" />
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}