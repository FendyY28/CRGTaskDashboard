import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  ChevronDown, 
  LayoutDashboard, 
  ListChecks, 
  TestTube2, 
  ClipboardCheck,
  BarChart3 // 🔥 Tambahkan icon BarChart3
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";

import BSILogo from "../../../assets/Logo BSI.png"; 
import { LanguageSwitcher } from "./LanguageSwitcher"; 

// 🔥 Import i18n Hook
import { useTranslation } from "react-i18next";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(); // 🔥 Aktifkan translator

  // Ambil data user dari Local Storage
  const userData = {
    name: localStorage.getItem("user_name") || "Guest User",
    email: localStorage.getItem("user_email") || "guest@bsi.co.id",
    role: localStorage.getItem("user_role") || "Staff",
  };

  // Fungsi membuat inisial (Contoh: "Fendy Yurista" -> "FY")
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // 🔥 Tambahkan menu Analytics dan gunakan terjemahan
  const navItems = [
    { id: "dashboard", label: t('header.menu.dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "analytics", label: t('header.menu.analytics'), icon: <BarChart3 className="h-4 w-4" /> }, // Posisi setelah Dashboard
    { id: "timeline", label: t('header.menu.timeline'), icon: <ListChecks className="h-4 w-4" /> },
    { id: "testing", label: t('header.menu.testing'), icon: <TestTube2 className="h-4 w-4" /> },
    { id: "post-implementation", label: t('header.menu.pir'), icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-[40] shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding BSI */}
          <Link 
            to="/dashboard" 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          >
            <img 
              src={BSILogo} 
              alt="BSI Logo" 
              className="h-25 w-auto object-contain" 
            />
            
            <div className="hidden sm:block leading-tight">
              <h1 className="font-bold text-gray-900">Bank Syariah Indonesia</h1>
              <p className="text-[12px] text-[#F9AD3C] font-bold uppercase tracking-wider">CRG Division</p>
            </div>
          </Link>

          {/* Navigasi Utama */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === `/${item.id}`;
              return (
                <Link
                  key={item.id}
                  to={`/${item.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] xl:text-sm font-semibold transition-all duration-200 ${
                    isActive 
                      ? "bg-[#36A39D] text-white shadow-md shadow-[#36A39D]/25" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#36A39D]"
                  }`}
                >
                  {item.icon}
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="inline xl:hidden">{item.label.substring(0,4)}.</span>
                </Link>
              );
            })}
          </nav>

          {/* Profile Dropdown Section & Language Switcher */}
          <div className="flex items-center gap-4 shrink-0">

            <LanguageSwitcher />

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button 
                  className="h-12 flex items-center gap-3 px-2 hover:bg-gray-50 transition-colors focus:outline-none group cursor-pointer border-none bg-transparent rounded-lg"
                >
                  <div className="text-right hidden md:block">
                    {/* Menggunakan Data User */}
                    <p className="text-sm font-bold text-gray-900 leading-none mb-1 capitalize">
                      {userData.name}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
                      {userData.role}
                    </p>
                  </div>
                  
                  <Avatar className="h-9 w-9 border-2 border-[#36A39D]">
                    {/* Inisial Dinamis */}
                    <AvatarFallback className="bg-[#36A39D]/10 text-[#36A39D] font-bold text-xs">
                      {getInitials(userData.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <ChevronDown className="h-4 w-4 text-gray-400 group-data-[state=open]:rotate-180 transition-transform" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent 
                  align="end" 
                  sideOffset={8}
                  className="z-[9999] w-60 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-1"
                >
                  <DropdownMenuLabel className="font-normal px-3 py-4 text-left">
                    <div className="flex flex-col space-y-1">
                      {/* Menggunakan Data User */}
                      <p className="text-sm font-bold text-gray-900 leading-none capitalize">
                        {userData.name}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium italic truncate">
                        {userData.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>                
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md text-red-600 focus:bg-red-50 focus:text-red-700 font-bold outline-none"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-bold">{t('header.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>

        </div>
      </div>
    </header>
  );
}