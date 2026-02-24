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
  <Card className={cn("border-none shadow-md bg-white overflow-hidden rounded-2xl ring-1 ring-gray-100", className)}>
    <div className="p-1" style={{ background: color }} />
    <CardHeader className="py-4 px-5 border-b border-gray-100 flex flex-row justify-between items-center bg-white sticky top-0 z-10">
      <div className="flex items-center gap-2 text-gray-800">
        {Icon && <Icon className="h-5 w-5" style={{ color: color.includes('#') ? color : '#36A39D' }} />}
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