import React from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";

export const DashboardInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <Input 
    {...props} 
    ref={ref}
    className={cn(`bg-gray-50 border-gray-200 text-sm p-3 rounded-xl h-auto focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#36A39D] placeholder:text-gray-400`, props.className)} 
  />
));
DashboardInput.displayName = "DashboardInput";

export const DashboardTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
  <Textarea 
    {...props} 
    ref={ref}
    className={cn(`bg-gray-50 border-gray-200 text-sm p-3 rounded-xl min-h-[100px] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[#36A39D] placeholder:text-gray-400`, props.className)} 
  />
));
DashboardTextarea.displayName = "DashboardTextarea";

export const DashboardSelect = ({ children, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select 
      {...props}
      className={cn(`w-full text-sm p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none appearance-none font-medium text-gray-700 focus:border-[#36A39D] focus:ring-1 focus:ring-[#36A39D] transition-all cursor-pointer`, className)}
    >
      {children}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <ChevronDown className="h-4 w-4" />
    </div>
  </div>
);