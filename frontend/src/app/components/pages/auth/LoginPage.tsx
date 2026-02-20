import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ChevronRight, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"; // Tambah Icon Baru
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import BSILogo from "../../../../assets/Logo BSI.png"; 

const AUTH_KEYS = { 
  TOKEN: "auth_token", 
  ROLE: "user_role",
  REMEMBER_ME: "remember_me_data" 
};

const inputCls = "pl-10 h-11 bg-gray-50/50 border-gray-200 focus:border-[#36A39D] focus:ring-[#36A39D]/20 transition-all";

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  
  // UI State: Kita tambah 'isResend' untuk mendeteksi status email dikirim ulang
  const [ui, setUi] = useState({ 
    loading: false, 
    showPass: false, 
    error: "",
    isResend: false // 👈 State baru
  });

  useEffect(() => {
    const rawData = localStorage.getItem(AUTH_KEYS.REMEMBER_ME);
    if (rawData) {
      const { email, loginDate } = JSON.parse(rawData);
      const today = new Date().toLocaleDateString();

      if (today !== loginDate) {
        localStorage.removeItem(AUTH_KEYS.REMEMBER_ME);
      } else {
        setForm(prev => ({ ...prev, email, rememberMe: true }));
      }
    }
  }, []);

  const updateForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [id]: type === "checkbox" ? checked : value 
    }));
    // Reset error saat user ketik ulang
    if (ui.error) setUi(prev => ({ ...prev, error: "", isResend: false }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi(prev => ({ ...prev, loading: true, error: "", isResend: false }));
    
    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Kredensial tidak valid.");

      // Login Sukses
      localStorage.setItem(AUTH_KEYS.TOKEN, result.access_token);
      localStorage.setItem(AUTH_KEYS.ROLE, result.user.role);
      localStorage.setItem("user_name", result.user.name);
      localStorage.setItem("user_email", result.user.email);

      if (form.rememberMe) {
        localStorage.setItem(AUTH_KEYS.REMEMBER_ME, JSON.stringify({
          email: form.email,
          loginDate: new Date().toLocaleDateString() 
        }));
      } else {
        localStorage.removeItem(AUTH_KEYS.REMEMBER_ME);
      }
      
      navigate("/dashboard");

    } catch (err: any) {
      // 💡 LOGIKA DETEKSI RESEND EMAIL
      // Jika pesan error mengandung kata "email verifikasi", kita ubah status UI
      const errorMessage = err.message;
      const isResendEmail = errorMessage.toLowerCase().includes("email verifikasi") || errorMessage.toLowerCase().includes("akun belum aktif");

      setUi(prev => ({ 
        ...prev, 
        error: errorMessage,
        isResend: isResendEmail // Aktifkan mode tampilan "Info" bukan "Error Merah"
      }));
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

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
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
              <p className="text-sm text-gray-500 font-medium">Sign in to access CRG Monitoring System</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <Input id="email" type="email" placeholder="name@bankbsi.id" className={inputCls} value={form.email} onChange={updateForm} disabled={ui.loading} required />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <Input id="password" type={ui.showPass ? "text" : "password"} placeholder="••••••••" className={inputCls} value={form.password} onChange={updateForm} disabled={ui.loading} required />
                <button type="button" onClick={() => setUi(p => ({ ...p, showPass: !p.showPass }))} className="absolute right-3 top-3.5 text-gray-400 hover:text-[#36A39D]">
                  {ui.showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="rememberMe"
                  checked={form.rememberMe}
                  onChange={updateForm}
                  className="h-4 w-4 rounded border-gray-300 text-[#36A39D] focus:ring-[#36A39D] cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs font-semibold text-gray-500 cursor-pointer select-none">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-xs text-[#36A39D] hover:underline font-bold transition-all">
                Forgot Password?
              </Link>
            </div>

            {/* 👇 ALERT KHUSUS: Beda Warna Tergantung Jenis Error */}
            {ui.error && (
              <div className={`p-3 border rounded-xl text-[11px] text-center font-semibold animate-in fade-in zoom-in-95 flex items-center justify-center gap-2
                ${ui.isResend 
                  ? "bg-yellow-50 border-yellow-200 text-yellow-700" // Warna Kuning untuk Info Resend
                  : "bg-red-50 border-red-100 text-red-600"         // Warna Merah untuk Error Biasa
                }`}>
                
                {ui.isResend ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{ui.error}</span>
              </div>
            )}

            <Button type="submit" className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-2xl shadow-lg shadow-[#36A39D]/20 mt-2 transition-all active:scale-[0.98]" disabled={ui.loading}>
              {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Check Credentials...</> : <>Login to Dashboard <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>

            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 font-medium">
                Don't have an account?{" "}
                <Link to="/register" className="text-[#36A39D] font-bold hover:underline transition-colors">
                  Register here
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="fixed bottom-6 text-[10px] font-medium text-gray-300 tracking-widest uppercase">© 2026 Bank Syariah Indonesia • CRG Division</p>
    </div>
  );
}