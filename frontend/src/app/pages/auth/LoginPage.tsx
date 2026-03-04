import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ChevronRight, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"; 
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

import { AuthLayout } from "../../components/layouts/AuthLayout";
import { DashboardInput } from "../../components/dashboard";
import { api } from "../../services/api"; 

const AUTH_KEYS = { 
  TOKEN: "auth_token", 
  ROLE: "user_role",
  REMEMBER_ME: "remember_me_data" 
};

const iconCls = "absolute left-3.5 top-3.5 h-4 w-4 text-gray-400";
const inputExtraCls = "pl-10"; 

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  
  const [ui, setUi] = useState({ 
    loading: false, 
    showPass: false, 
    error: "",
    isResend: false 
  });

  useEffect(() => {
    const rawData = localStorage.getItem(AUTH_KEYS.REMEMBER_ME);
    if (rawData) {
      try {
        const { email, loginDate } = JSON.parse(rawData);
        const today = new Date().toLocaleDateString();

        if (today !== loginDate) {
          localStorage.removeItem(AUTH_KEYS.REMEMBER_ME);
        } else {
          setForm(prev => ({ ...prev, email, rememberMe: true }));
        }
      } catch (e) {
        localStorage.removeItem(AUTH_KEYS.REMEMBER_ME);
      }
    }
  }, []);

  const updateForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [id]: type === "checkbox" ? checked : value 
    }));
    if (ui.error) setUi(prev => ({ ...prev, error: "", isResend: false }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi(prev => ({ ...prev, loading: true, error: "", isResend: false }));
    
    try {
      // Menggunakan api.post yang sudah bersih
      const result = await api.post("/auth/login", { 
        email: form.email, 
        password: form.password 
      });

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
      const errorMessage = err.message || "Failed to connect to the server.";
      const isResendEmail = errorMessage.toLowerCase().includes("email verifikasi") || errorMessage.toLowerCase().includes("akun belum aktif");

      setUi(prev => ({ 
        ...prev, 
        error: errorMessage,
        isResend: isResendEmail
      }));
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    // Bungkus HANYA dengan AuthLayout (BSI Logo & Footer otomatis terpasang)
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to access CRG Monitoring System"
    >
      <form onSubmit={handleLogin} className="space-y-5">
        
        {/* Input Email */}
        <div className="space-y-2 text-left relative">
          <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Email Address</Label>
          <div className="relative">
            <Mail className={iconCls} />
            <DashboardInput 
              id="email" 
              type="email" 
              placeholder="name@bankbsi.id" 
              className={inputExtraCls} 
              value={form.email} 
              onChange={updateForm} 
              disabled={ui.loading} 
              required 
            />
          </div>
        </div>

        {/* Input Password */}
        <div className="space-y-2 text-left relative">
          <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Password</Label>
          <div className="relative">
            <Lock className={iconCls} />
            <DashboardInput 
              id="password" 
              type={ui.showPass ? "text" : "password"} 
              placeholder="••••••••" 
              className={inputExtraCls} 
              value={form.password} 
              onChange={updateForm} 
              disabled={ui.loading} 
              required 
            />
            <button type="button" onClick={() => setUi(p => ({ ...p, showPass: !p.showPass }))} className="absolute right-3 top-3.5 text-gray-400 hover:text-[#36A39D] transition-colors">
              {ui.showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="rememberMe"
              checked={form.rememberMe}
              onChange={updateForm}
              className="h-4 w-4 rounded border-gray-300 text-[#36A39D] focus:ring-[#36A39D] cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700">
              Remember me
            </label>
          </div>
          <Link to="/forgot-password" className="text-xs text-[#36A39D] hover:underline font-bold transition-all">
            Forgot Password?
          </Link>
        </div>

        {/* Error / Info Alert */}
        {ui.error && (
          <div className={`p-3.5 border rounded-xl text-xs font-bold animate-in fade-in zoom-in-95 flex items-center gap-2.5
            ${ui.isResend 
              ? "bg-amber-50 border-amber-200 text-amber-700" 
              : "bg-red-50 border-red-100 text-red-600"
            }`}>
            {ui.isResend ? <AlertCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="leading-tight">{ui.error}</span>
          </div>
        )}

        {/* Tombol Submit */}
        <Button type="submit" className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-xl shadow-lg shadow-[#36A39D]/20 mt-4 transition-all active:scale-[0.98]" disabled={ui.loading}>
          {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : <>Secure Login <ChevronRight className="ml-1 h-4 w-4" /></>}
        </Button>

        {/* Link Register */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-500 font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#36A39D] font-bold hover:underline transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}