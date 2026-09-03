  import React from "react";
  import { Card, CardContent } from "../ui/card";
  import BSILogo from "../../../assets/Logo BSI.png";

  interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }

  export const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 font-sans bg-gradient-to-br from-[#00A39D]/15 via-[#FFFDF9] to-[#F8AD3C]/20 overflow-hidden">
        {/* Background ambient orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#00A39D]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#F8AD3C]/25 rounded-full blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md border border-white/60 shadow-2xl ring-1 ring-black/5 rounded-[2rem] bg-white/95 backdrop-blur-md overflow-hidden relative z-10">
          <CardContent className="p-10">
            
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-3 mb-6">
                <img src={BSILogo} alt="BSI Logo" className="h-24 w-auto object-contain" />
                <div className="h-8 w-[1.5px] bg-gray-200 mx-1" />
                <div className="flex flex-col text-left">
                  <span className="text-lg font-bold text-gray-900 leading-none tracking-tight">Bank Syariah Indonesia</span>
                  <span className="text-[11px] font-bold text-[#F9AD3C] uppercase tracking-widest mt-1">CRG Division</span>
                </div>
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
                <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
              </div>
            </div>

            {children}

          </CardContent>
        </Card>
        
        <p className="fixed bottom-6 text-[10px] font-bold text-gray-400 tracking-widest uppercase opacity-70">
          © {new Date().getFullYear()} Bank Syariah Indonesia • CRG Division
        </p>
      </div>
    );
  };