import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  ChevronDown, 
  LayoutDashboard, 
  ListChecks, 
  TestTube2, 
  ClipboardCheck,
  BarChart3,
  Users,
  User,
  AlertTriangle
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
import { useTranslation } from "react-i18next";
import { getUserRoleFromToken } from "../../../lib/utils";

import { THEME } from "../../constants/projectConstants"; 

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isPasswordExpiring, setIsPasswordExpiring] = useState(false);

  const userData = {
    name: localStorage.getItem("user_name") || "Guest User",
    email: localStorage.getItem("user_email") || "guest@bsi.co.id",
    role: getUserRoleFromToken() || "OFFICER", 
  };

  useEffect(() => {
    const lastChanged = localStorage.getItem("password_changed_at");
    const referenceDate = lastChanged ? new Date(lastChanged) : new Date();

    const expiryDate = new Date(referenceDate);
    expiryDate.setDate(expiryDate.getDate() + 180);
    
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) {
      setIsPasswordExpiring(true);
    } else {
      setIsPasswordExpiring(false);
    }
  }, [location.pathname]);

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleWarningClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/settings/profile');
  };

  const baseNavItems = [
    { id: "dashboard", label: t('header.menu.dashboard', 'Dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "analytics", label: t('header.menu.analytics', 'Analytics'), icon: <BarChart3 className="h-4 w-4" /> },
    { id: "timeline", label: t('header.menu.timeline', 'Timeline'), icon: <ListChecks className="h-4 w-4" /> },
    { id: "testing", label: t('header.menu.testing', 'Testing'), icon: <TestTube2 className="h-4 w-4" /> },
    { id: "post-implementation", label: t('header.menu.pir', 'PIR'), icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  const navItems = userData.role === 'ADMIN' 
    ? [...baseNavItems, { id: "users", label: t('header.menu.users', 'Users'), icon: <Users className="h-4 w-4" /> }]
    : baseNavItems;

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("password_changed_at");
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-[40] shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none shrink-0">
            <img src={BSILogo} alt="BSI Logo" className="h-8 w-auto object-contain" />
            <div className="hidden sm:block leading-tight">
              <h1 className="font-bold text-gray-900">Bank Syariah Indonesia</h1>
              <p style={{ color: THEME.BSI_YELLOW }} className="text-[12px] font-bold uppercase tracking-wider">CRG Division</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center justify-center flex-1 gap-1 px-4">
            {navItems.map((item) => {
              const isActive = location.pathname === `/${item.id}`;
              return (
                <Link
                  key={item.id}
                  to={`/${item.id}`}
                  style={isActive ? { backgroundColor: THEME.TOSCA, color: "#fff" } : {}}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] xl:text-sm font-semibold transition-all duration-200 ${
                    isActive ? "shadow-md shadow-teal-600/25" : "text-gray-600 hover:bg-gray-50 hover:text-[#38A79C]"
                  }`}
                >
                  {item.icon}
                  <span className="hidden xl:inline whitespace-nowrap">{item.label}</span>
                  <span className="inline xl:hidden">{item.label.substring(0,4)}.</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <LanguageSwitcher />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="h-12 flex items-center gap-3 px-2 hover:bg-gray-50 transition-colors focus:outline-none group cursor-pointer border-none bg-transparent rounded-lg relative">
                  
                  {/* 🔥 ICON TANPA ANIMASI BOUNCE */}
                  {isPasswordExpiring && (
                    <div 
                      onClick={handleWarningClick}
                      className="bg-red-100 p-1.5 rounded-full flex items-center justify-center border border-red-200 shadow-sm hover:bg-red-200 transition-colors z-10" 
                      title="Password akan segera kadaluarsa! Klik untuk ganti."
                    >
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  )}

                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-gray-900 leading-none mb-1 capitalize">{userData.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">{userData.role}</p>
                  </div>

                  <Avatar style={{ borderColor: THEME.TOSCA }} className="h-9 w-9 border-2">
                    <AvatarFallback style={{ backgroundColor: `${THEME.TOSCA}1A`, color: THEME.TOSCA }} className="font-bold text-xs">
                      {getInitials(userData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-400 group-data-[state=open]:rotate-180 transition-transform" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent align="end" sideOffset={8} className="z-[9999] w-60 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-1">
                  <DropdownMenuLabel className="font-normal px-3 py-4 text-left">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold text-gray-900 leading-none capitalize">{userData.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium italic truncate">{userData.email}</p>
                    </div>
                  </DropdownMenuLabel>                
                  <div className="h-px bg-gray-100 my-1 mx-1" />
                  <DropdownMenuItem onClick={() => navigate('/settings/profile')} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md text-gray-700 hover:bg-teal-50 hover:text-[#38A79C] focus:bg-teal-50 focus:text-[#38A79C] font-bold outline-none">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-bold">{t('header.profileSettings', 'Pengaturan Profil')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md text-red-600 focus:bg-red-50 focus:text-red-700 font-bold outline-none">
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-bold">{t('header.logout', 'Logout')}</span>
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