import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  User, 
  Settings, 
  ChevronDown, 
  LayoutDashboard, 
  ListChecks, 
  TestTube2, 
  ClipboardCheck 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";

// Import asset logo
import BSILogo from "../../../assets/Logo BSI.png"; 

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Ambil data user dari Local Storage
  const userData = {
    name: localStorage.getItem("user_name") || "Guest User",
    email: localStorage.getItem("user_email") || "guest@bsi.co.id",
    role: localStorage.getItem("user_role") || "Staff",
  };

  // 2. Fungsi membuat inisial (Contoh: "Fendy Yurista" -> "FY")
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "timeline", label: "Timeline", icon: <ListChecks className="h-4 w-4" /> },
    { id: "testing", label: "Testing", icon: <TestTube2 className="h-4 w-4" /> },
    { id: "post-implementation", label: "PIR", icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  const handleLogout = () => {
    // 3. Hapus SEMUA data saat logout
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
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === `/${item.id}`;
              return (
                <Link
                  key={item.id}
                  to={`/${item.id}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive 
                      ? "bg-[#36A39D] text-white shadow-md shadow-[#36A39D]/25" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#36A39D]"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Profile Dropdown Section (Dinamis) */}
          <div className="flex items-center">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button 
                  className="h-12 flex items-center gap-3 px-2 hover:bg-gray-50 transition-colors focus:outline-none group cursor-pointer border-none bg-transparent rounded-lg"
                >
                  <div className="text-right hidden lg:block">
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
                  
                  <DropdownMenuSeparator className="bg-gray-100" />
                  
                  <DropdownMenuItem 
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md focus:bg-[#36A39D]/10 focus:text-[#36A39D] outline-none"
                  >
                    <User className="h-4 w-4 opacity-70" />
                    <span className="font-medium text-sm">View Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md focus:bg-[#36A39D]/10 focus:text-[#36A39D] outline-none"
                  >
                    <Settings className="h-4 w-4 opacity-70" />
                    <span className="font-medium text-sm">Account Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-gray-100" />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-md text-red-600 focus:bg-red-50 focus:text-red-700 font-bold outline-none"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-bold">Logout from System</span>
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