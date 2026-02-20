import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Mail, ChevronRight, User, Loader2, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react"; 
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import BSILogo from "../../../../assets/Logo BSI.png"; 

const inputCls = "pl-10 h-11 bg-gray-50/50 border-gray-200 focus:border-[#36A39D] focus:ring-[#36A39D]/20 transition-all";

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  
  // UI State: loading, error, success, dan resendCooldown
  const [ui, setUi] = useState({ 
    loading: false, 
    error: "", 
    success: false,
    resendLoading: false 
  });

  // State untuk timer cooldown (detik)
  const [cooldown, setCooldown] = useState(0);

  // Effect untuk menjalankan timer mundur
  useEffect(() => {
    // 👇 PERBAIKAN DI SINI: Ganti 'NodeJS.Timeout' jadi 'any' atau hapus tipe-nya
    let timer: any; 

    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    
    // Cleanup timer saat component unmount atau cooldown 0
    return () => clearInterval(timer);
  }, [cooldown]);

  const updateForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    if (ui.error) setUi(prev => ({ ...prev, error: "" }));
  };

  // Logic memanggil API
  const performRegister = async () => {
    const response = await fetch("http://localhost:3000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Registration failed");
    return result;
  };

  // Fungsi Register Utama
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
      setCooldown(30); // Set cooldown awal 30 detik
    } catch (err: any) {
      setUi(prev => ({ ...prev, error: err.message }));
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  // Fungsi Kirim Ulang Email
  const handleResendEmail = async () => {
    if (cooldown > 0) return; 

    setUi(prev => ({ ...prev, resendLoading: true }));
    try {
      await performRegister(); 
      setCooldown(60); // Reset cooldown ke 60 detik jika resend
    } catch (err: any) {
        alert("Gagal mengirim ulang: " + err.message);
    } finally {
      setUi(prev => ({ ...prev, resendLoading: false }));
    }
  };

  // Fungsi Reset Halaman
  const handleReset = () => {
    setUi(prev => ({ ...prev, success: false, error: "" }));
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    setCooldown(0); 
  };

  // ✅ TAMPILAN SUKSES
  if (ui.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
        <Card className="w-full max-w-md border-none shadow-2xl p-8 rounded-[2rem] bg-white text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center">
                <Mail className="h-10 w-10 text-[#36A39D] animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Inbox!</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            We have sent a verification link to <span className="font-bold text-gray-800">{form.email}</span>. 
            <br/>Please verify your account before logging in.
          </p>

          <div className="space-y-3">
            <Button 
                onClick={handleReset} 
                className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 font-bold rounded-xl"
            >
                Back to Register <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={cooldown > 0 || ui.resendLoading}
                className={`w-full h-11 border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 hover:text-[#36A39D] transition-colors ${cooldown > 0 ? "opacity-70 cursor-not-allowed" : ""}`}
            >
                {ui.resendLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : cooldown > 0 ? (
                    <span className="flex items-center">
                        Resend Email in {cooldown}s
                    </span>
                ) : (
                    <span className="flex items-center">
                        <RefreshCw className="mr-2 h-4 w-4" /> Resend Email
                    </span>
                )}
            </Button>

            <p className="text-xs text-gray-400 pt-2">
                Didn't receive email? Check spam or click Resend.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ... (TAMPILAN FORM REGISTER) ...
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
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Account</h1>
              <p className="text-sm text-gray-500 font-medium">Join CRG Monitoring Access Portal</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <Input id="name" type="text" placeholder="Enter your full name" className={inputCls} value={form.name} onChange={updateForm} disabled={ui.loading} required />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <Input id="email" type="email" placeholder="name@bankbsi.id" className={inputCls} value={form.email} onChange={updateForm} disabled={ui.loading} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                    <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                        <Input id="password" type="password" placeholder="••••••••" className={inputCls} value={form.password} onChange={updateForm} disabled={ui.loading} required />
                    </div>
                </div>

                <div className="space-y-1.5 text-left">
                    <Label htmlFor="confirmPassword" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Confirm</Label>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                        <Input id="confirmPassword" type="password" placeholder="••••••••" className={inputCls} value={form.confirmPassword} onChange={updateForm} disabled={ui.loading} required />
                    </div>
                </div>
            </div>

            {ui.error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[11px] text-center font-semibold animate-in fade-in zoom-in-95">
                {ui.error}
              </div>
            )}

            <Button type="submit" className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-2xl shadow-lg shadow-[#36A39D]/20 mt-2 transition-all active:scale-[0.98]" disabled={ui.loading}>
              {ui.loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : <>Register Account <ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>

            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 font-medium">
                Already have an account?{" "}
                <Link to="/login" className="text-[#36A39D] font-bold hover:underline transition-colors">
                  Login here
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