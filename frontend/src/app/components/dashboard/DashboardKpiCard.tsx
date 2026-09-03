import { Card, CardContent } from "../ui/card";
import { cn } from "../../../lib/utils";
import { type LucideIcon } from "lucide-react";

export interface KpiCardProps {
  label: string;
  count: number | string;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
  active?: boolean;
  trend?: string;
  description?: string;
  clickable?: boolean;
}

export const DashboardKpiCard = ({ label, count, icon: Icon, color, onClick, active, trend, description, clickable = true }: KpiCardProps) => (
  <Card 
    onClick={clickable ? onClick : undefined} 
    className={cn(
      "relative overflow-hidden border border-white/60 bg-white/95 backdrop-blur-md rounded-2xl transition-all duration-300 shadow-xl shadow-teal-950/5 group",
      clickable ? "cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:border-white ring-1 ring-black/5" : "shadow-lg ring-1 ring-black/5",
      active ? "ring-2 ring-white border-transparent scale-[1.02]" : ""
    )}
    style={{ borderColor: active ? color : undefined, boxShadow: active ? `0 12px 30px -5px ${color}40` : undefined }}
  >
    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1 text-left">
          <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">{label}</p>
          <h3 className="text-4xl font-black text-gray-900 tracking-tight">{count}</h3>
        </div>
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-xs" style={{ backgroundColor: `${color}18`, color: color }}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {(trend || description || clickable) && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium min-h-[20px] text-left">
          {clickable && onClick ? (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0" />
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