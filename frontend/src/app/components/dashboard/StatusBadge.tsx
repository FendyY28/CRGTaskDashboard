import { Badge } from "../ui/badge";
import { cn, capitalize } from "../../../lib/utils";

const STYLES: Record<string, string> = {
  critical: "border-l-[#7C2D12] text-[#7C2D12] bg-[#7C2D12]/5 border-[#7C2D12]/20", 
  high: "border-l-[#E11D48] text-[#E11D48] bg-[#E11D48]/5 border-[#E11D48]/20", 
  medium: "border-l-[#F9AD3C] text-[#F9AD3C] bg-[#F9AD3C]/5 border-[#F9AD3C]/20", 
  low: "border-l-[#36A39D] text-[#36A39D] bg-[#36A39D]/5 border-[#36A39D]/20",
  "on-track": "bg-[#36A39D]/10 text-[#36A39D] border-[#36A39D]/20",
  "at-risk": "bg-[#F9AD3C]/10 text-[#B45309] border-[#F9AD3C]/20",
  "overdue": "bg-red-50 text-[#E11D48] border-red-100",
  completed: "bg-[#059669]/10 text-[#059669] border-[#059669]/20",
  "in-progress": "bg-[#F9AD3C]/10 text-[#d98b1e] border-[#F9AD3C]/20",
  open: "bg-red-100 text-red-700 border-red-200", 
  resolved: "bg-[#36A39D]/10 text-[#36A39D] border-[#36A39D]/20",
  default: "bg-gray-100 text-gray-600 border-gray-200"
};

export const getStatusStyle = (val: string) => STYLES[val?.toLowerCase()] || STYLES.default;

export interface StatusBadgeProps {
  value: string;
  className?: string;
  type?: 'status' | 'priority';
}

export const StatusBadge = ({ value, className = "" }: StatusBadgeProps) => {
  const s = getStatusStyle(value);
  return (
    <Badge variant="outline" className={cn(`${s} border text-[10px] px-2.5 py-0.5 uppercase tracking-wide font-bold shadow-none rounded-md`, className)}>
      {capitalize(value)}
    </Badge>
  );
};