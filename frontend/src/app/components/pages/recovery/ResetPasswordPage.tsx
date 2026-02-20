import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ShieldCheck, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import BSILogo from "../../../../assets/Logo BSI.png"; 

const inputCls = "pl-10 h-11 bg-gray-50/50 border-gray-200 focus:border-[#36A39D] focus:ring-[#36A39D]/20 transition-all";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Mengambil email dari URL parameter (?email=yurista@gmail.com)
  const email = searchParams.get("email");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [ui, setUi] = useState({ loading: false, error: "", success: false });

  // Proteksi sederhana: Jika tidak ada email di URL, tendang balik ke login
  useEffect(() => {
    if (!email) {
      navigate("/login");
    }
  }, [email, navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "", success: false });

    // Validasi kecocokan password
    if (form.password !== form.confirmPassword) {
      setUi({ loading: false, error: "Password konfirmasi tidak cocok!", success: false });
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: form.password }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Gagal memperbarui password.");

      setUi({ loading: false, error: "", success: true });
      setTimeout(() => navigate("/login"), 3000); // Redirect ke login setelah 3 detik
    } catch (err: any) {
      setUi({ loading: false, error: err.message, success: false });
    }
  };

  if (ui.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <Card className="w-full max-w-sm border-none shadow-xl text-center p-12 rounded-2xl bg-white">
          <CheckCircle2 className="h-16 w-16 text-[#36A39D] mx-auto mb-6 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-900">Password Updated!</h2>
          <p className="mt-2 text-gray-500 text-sm font-medium">Your password has been changed successfully. Redirecting to login...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      <Card className="w-full max-w-md border-none shadow-2xl ring-1 ring-gray-100 rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-6">
              <img src={BSILogo} alt="BSI Logo" className="h-23 w-auto object-contain" />
              <div className="h-8 w-[1.5px] bg-gray-200 mx-1" />
              <div className="flex flex-col text-left">
                <span className="text-lg font-bold text-gray-900 leading-none tracking-tight">Bank Syariah Indonesia</span>
                <span className="text-[11px] font-bold text-[#F9AD3C] uppercase tracking-widest mt-1">CRG Division</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Password</h1>
              <p className="text-sm text-gray-500 font-medium">Resetting account for: <span className="text-[#36A39D] font-bold">{email}</span></p>
            </div>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="password" title="New Password" />
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter new password" 
                  className={inputCls} 
                  value={form.password} 
                  onChange={(e) => setForm({...form, password: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="confirmPassword" title="Confirm New Password" />
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirm new password" 
                  className={inputCls} 
                  value={form.confirmPassword} 
                  onChange={(e) => setForm({...form, confirmPassword: e.target.value})} 
                  required 
                />
              </div>
            </div>

            {ui.error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[11px] text-center font-semibold">
                {ui.error}
              </div>
            )}

            <Button type="submit" className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-2xl shadow-lg mt-2" disabled={ui.loading}>
              {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : <>Update Password <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}