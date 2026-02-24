import { cn } from "../../../lib/utils";
import { type LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  color?: string;
}

export const PageHeader = ({ title, description, icon: Icon, color = "text-gray-900" }: PageHeaderProps) => (
  <div className="flex flex-col gap-1 text-left mb-6">
    <h2 className={cn("text-2xl font-bold tracking-tight flex items-center gap-2", color)}>
      {Icon && <Icon className="h-6 w-6" />} {title}
    </h2>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);