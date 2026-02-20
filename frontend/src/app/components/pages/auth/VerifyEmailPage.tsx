import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button"; // Pastikan import Button ada
import BSILogo from "../../../../assets/Logo BSI.png";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  // State status: loading | success | error
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  
  // 👇 REF PENTING: Mencegah request ganda (Strict Mode issue)
  const hasFetched = useRef(false);

  useEffect(() => {
    // Jika tidak ada token, atau API sudah pernah dipanggil -> Stop.
    if (!token || hasFetched.current) return;

    // Tandai bahwa kita sudah memproses token ini
    hasFetched.current = true;

    const verify = async () => {
      try {
        const response = await fetch("http://localhost:3000/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
           const result = await response.json();
           throw new Error(result.message);
        }

        // ✅ SUKSES
        setStatus("success");
        
        // Redirect otomatis ke login setelah 3 detik
        setTimeout(() => {
          navigate("/login");
        }, 3000);

      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      <Card className="w-full max-w-sm border-none shadow-xl text-center p-10 rounded-[2rem] bg-white">
        <img src={BSILogo} alt="BSI" className="h-12 mx-auto mb-6 object-contain" />
        
        {/* === STATE 1: LOADING === */}
        {status === "loading" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Loader2 className="h-16 w-16 text-[#36A39D] mx-auto animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Verifying...</h2>
            <p className="text-gray-500 text-sm mt-2">Mohon tunggu, memvalidasi token Anda.</p>
          </div>
        )}

        {/* === STATE 2: SUCCESS === */}
        {status === "success" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-500 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Email Verified!</h2>
            <p className="text-gray-500 text-sm mb-6 mt-2">
                Akun Anda telah aktif. Selamat datang di BSI CRG Dashboard.
            </p>
            
            {/* Indikator Redirect */}
            <div className="flex items-center justify-center gap-2 text-xs text-[#36A39D] font-bold bg-[#36A39D]/10 py-2 px-4 rounded-full w-fit mx-auto animate-pulse">
               <Loader2 className="h-3 w-3 animate-spin" />
               Mengalihkan ke Login Page...
            </div>
          </div>
        )}

        {/* === STATE 3: ERROR === */}
        {status === "error" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Verifikasi Gagal</h2>
            <p className="text-gray-500 text-sm mb-6 mt-2 leading-relaxed">
                Token tidak valid atau sudah kedaluwarsa.<br/>
                <span className="text-xs text-gray-400">(Jika Anda me-refresh halaman, kemungkinan akun sudah aktif)</span>
            </p>
            
            <div className="space-y-3">
                {/* Opsi 1: Coba Login (Penting jika error karena refresh) */}
                <Button 
                    onClick={() => navigate("/login")}
                    className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white font-bold rounded-xl"
                >
                    Coba Login
                </Button>

                {/* Opsi 2: Daftar Ulang (Jika benar-benar expired) */}
                <Link 
                    to="/register" 
                    className="flex items-center justify-center gap-1 text-gray-400 hover:text-[#36A39D] font-semibold text-xs transition-colors"
                >
                    Token expired? Daftar Ulang <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
          </div>
        )}
      </Card>
      
      {/* Footer Copyright */}
      <p className="fixed bottom-6 text-[10px] font-medium text-gray-300 tracking-widest uppercase">
        © 2026 Bank Syariah Indonesia • CRG Division
      </p>
    </div>
  );
}