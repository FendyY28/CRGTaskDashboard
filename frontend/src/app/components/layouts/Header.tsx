import { Link, useLocation, useNavigate } from "react-router-dom";
import {  LogOut, ChevronDown, User } from "lucide-react";
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
import { getNavItemsForRole, isNavItemActive } from "../../constants/navigation";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const userData = {
    name: localStorage.getItem("user_name") || "Guest User",
    email: localStorage.getItem("user_email") || "guest@bsi.co.id",
    role: getUserRoleFromToken() || "OFFICER",
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const navItems = getNavItemsForRole(userData.role);

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
    <header className="bg-white/85 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-[40] shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16">
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-lg cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A79C] focus-visible:ring-offset-2"
            >
              <img src={BSILogo} alt="BSI Logo" className="h-8 w-auto object-contain" />
              <div className="hidden sm:block leading-tight">
                <h1 className="font-bold text-gray-900">Bank Syariah Indonesia</h1>
                <p
                  className="text-[12px] font-bold uppercase tracking-wider"
                  style={{ color: THEME.BSI_LIGHT_GOLD }}
                >
                  CRG Division
                </p>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center justify-center flex-1 gap-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(location.pathname, item.id);
              return (
                <Link
                  key={item.id}
                  to={`/${item.id}`}
                  aria-current={isActive ? "page" : undefined}
                  style={isActive ? { backgroundColor: THEME.TOSCA, color: "#fff" } : {}}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] xl:text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#38A79C] ${
                    isActive ? "shadow-md shadow-teal-600/25" : "text-gray-700 hover:bg-gray-50 hover:text-[#2B7C74]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(`header.menu.${item.id}`, item.id)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <LanguageSwitcher />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="h-12 flex items-center gap-2 sm:gap-3 px-2 hover:bg-gray-50 transition-colors group cursor-pointer border-none bg-transparent rounded-lg relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A79C] focus-visible:ring-offset-2">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-gray-900 leading-none mb-1 capitalize">{userData.name}</p>
                    <p className="text-label text-gray-600 uppercase font-bold tracking-tight">{userData.role}</p>
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
                      <p className="text-meta text-gray-500 font-medium italic truncate">{userData.email}</p>
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
