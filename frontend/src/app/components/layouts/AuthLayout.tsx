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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
        <Card className="w-full max-w-md border-none shadow-2xl ring-1 ring-gray-100 rounded-[2rem] bg-white overflow-hidden relative z-10">
          <CardContent className="p-10">
            
            {/* Bagian Header & Logo (Sekarang hanya ditulis SATU KALI di sini) */}
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

            {/* Form spesifik dari masing-masing halaman akan masuk ke sini */}
            {children}

          </CardContent>
        </Card>
        
        {/* Footer dinamis (Hanya ditulis SATU KALI di sini) */}
        <p className="fixed bottom-6 text-[10px] font-bold text-gray-400 tracking-widest uppercase opacity-70">
          © {new Date().getFullYear()} Bank Syariah Indonesia • CRG Division
        </p>
      </div>
    );
  };