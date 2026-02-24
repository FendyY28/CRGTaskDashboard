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
      
      {(trend || description || clickable) && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium min-h-[20px]">
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