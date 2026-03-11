import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";

import { AuthLayout } from "../../components/layouts/AuthLayout";
import { api } from "../../services/api";

import { THEME } from "../../constants/projectConstants";

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
        await api.post("/auth/verify-email", { token });

        setStatus("success");
        setTimeout(() => navigate("/login"), 3000);
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    verify();
  }, [token, navigate]);

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
            <div style={{ backgroundColor: `${THEME.TOSCA}1A` }} className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
               <Loader2 style={{ color: THEME.TOSCA }} className="h-10 w-10 animate-spin" />
            </div>
          </div>
        )}

        {/* STATE: SUCCESS */}
        {status === "success" && (
          <div className="space-y-6">
            <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
            </div>
            <div 
              style={{ backgroundColor: `${THEME.TOSCA}0D`, color: THEME.TOSCA, borderColor: `${THEME.TOSCA}1A` }} 
              className="flex items-center justify-center gap-2 text-[11px] font-bold py-2.5 px-5 rounded-xl w-fit mx-auto border"
            >
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
                style={{ backgroundColor: THEME.TOSCA }}
                className="w-full text-white hover:brightness-95 font-bold rounded-xl h-12 shadow-lg"
              >
                Go to Login
              </Button>

              <Link 
                to="/register" 
                style={{ color: THEME.TOSCA }}
                className="flex items-center justify-center gap-1.5 opacity-70 hover:opacity-100 font-bold text-xs transition-opacity group"
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