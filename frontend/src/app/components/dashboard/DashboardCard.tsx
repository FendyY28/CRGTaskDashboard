import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../../lib/utils";
import { type LucideIcon } from "lucide-react";

export interface DashboardCardProps {
  color: string;
  title: string | React.ReactNode;
  icon?: LucideIcon;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const DashboardCard = ({ color, title, icon: Icon, headerAction, children, className, contentClassName }: DashboardCardProps) => (
  <Card className={cn("border border-white/60 shadow-xl shadow-teal-950/5 bg-white/95 backdrop-blur-md overflow-hidden rounded-2xl ring-1 ring-black/5", className)}>
    {/* Ini adalah border atasnya */}
    <div className="p-1" style={{ background: color }} /> 
    
    <CardHeader className="py-4 px-6 border-b border-gray-100/80 flex flex-row justify-between items-center bg-white/90 backdrop-blur-xs sticky top-0 z-10">
      <div className="flex items-center gap-2 text-gray-800">
        {Icon && <Icon className="h-5 w-5" style={{ color: color }} />}
        <div className="flex flex-col">
          {typeof title === 'string' ? (
            // Teks diperbesar (text-xl) dan warnanya persis mengikuti warna prop "color"
            <CardTitle className="text-lg font-bold uppercase tracking-wide" style={{ color: color }}>
              {title}
            </CardTitle>
          ) : (
            title
          )}
        </div>
      </div>
      {headerAction}
    </CardHeader>
    <CardContent className={cn("p-6 bg-white/90", contentClassName)}>
      {children}
    </CardContent>
  </Card>
);