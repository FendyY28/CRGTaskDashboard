import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ChevronRight, Loader2, ArrowLeft, Send } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import BSILogo from "../../../../assets/Logo BSI.png"; 

const inputCls = "pl-10 h-11 bg-gray-50/50 border-gray-200 focus:border-[#36A39D] focus:ring-[#36A39D]/20 transition-all";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); 
  const [ui, setUi] = useState({ loading: false, error: "", success: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi({ loading: true, error: "", success: false });

    try {
      // ✅ Simulasi pemanggilan API ke backend NestJS
      const response = await fetch("http://localhost:3000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengirim email reset.");
      }

      // Jika berhasil
      setUi({ loading: false, error: "", success: true });
    } catch (err: any) {
      setUi({ loading: false, error: err.message, success: false });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      <Card className="w-full max-w-md border-none shadow-2xl ring-1 ring-gray-100 rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-10">
          
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-6">
              <img src={BSILogo} alt="BSI Logo" className="h-23 w-auto object-contain" />
              <div className="h-8 w-[1.5px] bg-gray-200 mx-1" />
              <div className="flex flex-col text-left">
                <span className="text-lg font-bold text-gray-900 leading-none tracking-tight">Bank Syariah Indonesia</span>
                <span className="text-[11px] font-bold text-[#F9AD3C] uppercase tracking-widest mt-1">CRG Division</span>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reset Password</h1>
              <p className="text-sm text-gray-500 font-medium px-4">
                Enter your work email and we'll send you instructions to reset your password.
              </p>
            </div>
          </div>

          {ui.success ? (
            /* Success State View */
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 bg-[#36A39D]/10 rounded-full flex items-center justify-center">
                <Send className="h-8 w-8 text-[#36A39D]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Check your email</h3>
                <p className="text-sm text-gray-500 font-medium">
                  We have sent a password reset link to <br />
                  <span className="text-gray-900 font-bold">{email}</span>
                </p>
              </div>
              <Button asChild className="w-full bg-[#36A39D] hover:bg-[#2b8580] rounded-2xl h-11">
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
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-left">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Work Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@bankbsi.id" 
                    className={inputCls} 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    disabled={ui.loading} 
                    required 
                  />
                </div>
              </div>

              {ui.error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[11px] text-center font-semibold">
                  {ui.error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white h-12 text-sm font-bold rounded-2xl shadow-lg shadow-[#36A39D]/20 transition-all active:scale-[0.98]" 
                disabled={ui.loading || !email}
              >
                {ui.loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <>Send Reset Link <ChevronRight className="ml-1 h-4 w-4" /></>
                )}
              </Button>

              <div className="text-center">
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
        </CardContent>
      </Card>
      <p className="fixed bottom-6 text-[10px] font-medium text-gray-300 tracking-widest uppercase">
        © 2026 Bank Syariah Indonesia • CRG Division
      </p>
    </div>
  );
}