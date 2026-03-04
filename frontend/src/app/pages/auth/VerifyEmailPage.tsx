import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";

import { AuthLayout } from "../../components/layouts/AuthLayout";
import { api } from "../../services/api";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token || hasFetched.current) return;
    hasFetched.current = true;

    const verify = async () => {
      try {
        // Gunakan API Service
        await api.post("/auth/verify-email", { token });

        setStatus("success");
        
        // Auto-redirect
        setTimeout(() => navigate("/login"), 3000);
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    verify();
  }, [token, navigate]);

  // Dinamis Title & Subtitle berdasarkan State
  const getHeader = () => {
    if (status === "loading") return { t: "Verifying...", s: "Please wait while we validate your token." };
    if (status === "success") return { t: "Email Verified!", s: "Your account is now active. Welcome to BSI CRG." };
    return { t: "Verification Failed", s: "Your token is invalid or has expired." };
  };

  const header = getHeader();

  return (
    <AuthLayout title={header.t} subtitle={header.s}>
      <div className="text-center animate-in fade-in zoom-in-95 duration-500">
        
        {/* STATE: LOADING */}
        {status === "loading" && (
          <div className="py-6">
            <div className="h-20 w-20 bg-[#36A39D]/5 rounded-full flex items-center justify-center mx-auto mb-4">
               <Loader2 className="h-10 w-10 text-[#36A39D] animate-spin" />
            </div>
          </div>
        )}

        {/* STATE: SUCCESS */}
        {status === "success" && (
          <div className="space-y-6">
            <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-[#36A39D] font-bold bg-[#36A39D]/5 py-2.5 px-5 rounded-xl w-fit mx-auto border border-[#36A39D]/10">
               <Loader2 className="h-3.5 w-3.5 animate-spin" />
               Redirecting to Login...
            </div>
          </div>
        )}

        {/* ERROR */}
        {status === "error" && (
          <div className="space-y-6">
            <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-rose-500" />
            </div>
            
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic">
              Account might be already active if you refreshed. <br/>
              Please try logging in to confirm.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate("/login")}
                className="w-full bg-[#36A39D] hover:bg-[#2b8580] text-white font-bold rounded-xl h-12 shadow-lg shadow-[#36A39D]/10"
              >
                Go to Login
              </Button>

              <Link 
                to="/register" 
                className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-[#36A39D] font-bold text-xs transition-colors group"
              >
                Need a new token? Register <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}