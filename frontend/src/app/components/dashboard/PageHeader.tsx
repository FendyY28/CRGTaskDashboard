import { cn } from "../../../lib/utils";
import { type LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  color?: string;
}

export const PageHeader = ({ title, description, icon: Icon, color = "text-white" }: PageHeaderProps) => (
  <div className="flex flex-col gap-1 text-left mb-6">
    <h2 className={cn("text-2xl font-black tracking-tight flex items-center gap-2 text-white drop-shadow-xs", color !== "text-gray-900" ? color : "text-white")}>
      {Icon && <Icon className="h-6 w-6" />} {title}
    </h2>
    <p className="text-sm text-white/90 font-medium drop-shadow-xs">{description}</p>
  </div>
);