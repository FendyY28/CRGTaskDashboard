import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { cn, capitalize } from "../../../lib/utils";

// --- 1. PAGE HEADER ---
export const PageHeader = ({ title, description, icon: Icon, color = "text-gray-900" }: any) => (
  <div className="flex flex-col gap-1 text-left mb-6">
    <h2 className={cn("text-2xl font-bold tracking-tight flex items-center gap-2", color)}>
      {Icon && <Icon className="h-6 w-6" />} {title}
    </h2>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

// --- 2. KPI CARD (Style TaskTimeline) ---
export const DashboardKpiCard = ({ label, count, icon: Icon, color, onClick, active, trend, description, clickable = true }: any) => (
  <Card 
    onClick={clickable ? onClick : undefined} 
    className={cn(
      "relative overflow-hidden border bg-white rounded-xl transition-all duration-300 group",
      clickable ? "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-offset-1 border-gray-100" : "border-gray-100 shadow-sm",
      active ? "ring-2 ring-offset-2 border-transparent" : ""
    )}
    style={{ borderColor: active ? color : undefined, boxShadow: active ? `0 0 0 2px ${color}33` : undefined }}
  >
    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">{label}</p>
          <h3 className="text-4xl font-black text-gray-800">{count}</h3>
        </div>
        <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-colors group-hover:bg-opacity-20" style={{ backgroundColor: `${color}15`, color: color }}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {/* Footer Area */}
      {(trend || description || clickable) && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium min-h-[20px]">
          {clickable && onClick ? (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
            </div>
          ) : (
            <>
              {trend && <span style={{ color }} className="font-bold">{trend}</span>}
              {description && <span className="text-gray-400">{description}</span>}
            </>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

// --- 3. STATUS BADGE (Unified Styles) ---
const STYLES: any = {
  // Priorities / Risks
  critical: "border-l-[#7C2D12] text-[#7C2D12] bg-[#7C2D12]/5 border-[#7C2D12]/20", 
  high: "border-l-[#E11D48] text-[#E11D48] bg-[#E11D48]/5 border-[#E11D48]/20", 
  medium: "border-l-[#F9AD3C] text-[#F9AD3C] bg-[#F9AD3C]/5 border-[#F9AD3C]/20", 
  low: "border-l-[#36A39D] text-[#36A39D] bg-[#36A39D]/5 border-[#36A39D]/20",
  // Project Status
  "on-track": "bg-[#36A39D]/10 text-[#36A39D] border-[#36A39D]/20",
  "at-risk": "bg-[#F9AD3C]/10 text-[#B45309] border-[#F9AD3C]/20",
  "overdue": "bg-red-50 text-[#E11D48] border-red-100",
  completed: "bg-[#059669]/10 text-[#059669] border-[#059669]/20",
  "in-progress": "bg-[#F9AD3C]/10 text-[#d98b1e] border-[#F9AD3C]/20",
  // Generic Status
  open: "bg-red-100 text-red-700 border-red-200", 
  resolved: "bg-[#36A39D]/10 text-[#36A39D] border-[#36A39D]/20",
  default: "bg-gray-100 text-gray-600 border-gray-200"
};

export const getStatusStyle = (val: string) => STYLES[val?.toLowerCase()] || STYLES.default;

// ✅ FIX: Memperbaiki props destructuring (type diambil, className default empty string)
export const StatusBadge = ({ value, className = "" }: { value: string, className?: string, type?: 'status' | 'priority' }) => {
  const s = getStatusStyle(value);
  return (
    <Badge variant="outline" className={cn(`${s} border text-[10px] px-2.5 py-0.5 uppercase tracking-wide font-bold shadow-none rounded-md`, className)}>
      {capitalize(value)}
    </Badge>
  );
};

// --- 4. CONSISTENT FORM INPUTS (Abu-abu, Rounded XL) ---
export const DashboardInput = (props: any) => (
  <Input 
    {...props} 
    className={cn(`bg-gray-50 border-gray-200 text-sm p-3 rounded-xl h-auto focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#36A39D] placeholder:text-gray-400`, props.className)} 
  />
);

export const DashboardTextarea = (props: any) => (
  <Textarea 
    {...props} 
    className={cn(`bg-gray-50 border-gray-200 text-sm p-3 rounded-xl min-h-[100px] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#36A39D] placeholder:text-gray-400`, props.className)} 
  />
);

export const DashboardSelect = ({ children, ...props }: any) => (
  <div className="relative">
    <select 
      {...props}
      className={cn(`w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none appearance-none font-medium text-gray-700 focus:border-[#36A39D] focus:ring-1 focus:ring-[#36A39D] transition-all cursor-pointer`, props.className)}
    >
      {children}
    </select>
    {/* Icon Chevron Custom */}
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <ChevronDown className="h-4 w-4" />
    </div>
  </div>
);

// --- 5. DASHBOARD CARD ---
export const DashboardCard = ({ color, title, icon: Icon, headerAction, children, className, contentClassName }: any) => (
  <Card className={cn("border-none shadow-md bg-white overflow-hidden rounded-2xl ring-1 ring-gray-100", className)}>
    <div className="p-1" style={{ background: color }} />
    <CardHeader className="py-4 px-5 border-b border-gray-100 flex flex-row justify-between items-center bg-white sticky top-0 z-10">
      <div className="flex items-center gap-2 text-gray-800">
        {/* Render Icon jika ada */}
        {Icon && <Icon className="h-5 w-5" style={{ color: color.includes('#') ? color : '#36A39D' }} />}
        
        {/* ✅ Bagian ini dibuat fleksibel: bisa string, bisa JSX */}
        <div className="flex flex-col">
          {typeof title === 'string' ? (
            <CardTitle className="text-sm font-bold text-gray-800">{title}</CardTitle>
          ) : (
            title
          )}
        </div>
      </div>
      {headerAction}
    </CardHeader>
    <CardContent className={cn("p-5 bg-white", contentClassName)}>
      {children}
    </CardContent>
  </Card>
);

// --- 6. FEEDBACK MESSAGE ---
export const FeedbackMsg = ({ status }: { status: { type: string, text: string } }) => (
    <div className={`text-xs font-bold p-3 rounded-xl border flex items-center gap-2 animate-in fade-in ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
        {status.type === 'success' ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>} {status.text}
    </div>
);