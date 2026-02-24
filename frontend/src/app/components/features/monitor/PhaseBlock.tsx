import { useState, memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ProjectRow } from "./ProjectRow";
import { PROJECT_STATUS } from "../../../constants/projectConstants";
import type { Project } from "../../../types";

const PROGRESS_COLORS: Record<string, string> = { 
  [PROJECT_STATUS.COMPLETED]: "#36A39D", 
  [PROJECT_STATUS.IN_PROGRESS]: "#F9AD3C", 
  [PROJECT_STATUS.PENDING]: "#E5E7EB" 
};

interface PhaseBlockProps {
  p: {
    phase: string;
    progress: number;
    count: number;
    status: string;
    projects: Project[];
  };
  onEdit: (proj: Project) => void;
  onDelete: (id: string) => void;
}

export const PhaseBlock = memo(({ p, onEdit, onDelete }: PhaseBlockProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm transition-all duration-300 overflow-hidden ring-1 ring-transparent hover:ring-[#36A39D]/20 mb-3 last:mb-0">
      <div 
        className={`flex justify-between items-center p-5 cursor-pointer select-none transition-colors ${isOpen ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-base font-bold transition-colors ${isOpen ? 'text-[#36A39D]' : 'text-gray-700'}`}>{p.phase}</span>
        <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs font-medium">{p.count} projects</span>
            {isOpen ? <ChevronUp className="h-4 w-4 text-[#36A39D]" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-1">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.progress}%`, backgroundColor: PROGRESS_COLORS[p.status] }} />
        </div>
        {isOpen && (
            <div className="mt-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {p.projects.length > 0 ? p.projects.map((proj) => (
                <ProjectRow key={proj.id} proj={proj} onEdit={onEdit} onDelete={onDelete} />
            )) : <p className="text-xs text-gray-400 text-center italic py-4">No projects are currently in this phase.</p>}
            </div>
        )}
      </div>
    </div>
  );
});

PhaseBlock.displayName = "PhaseBlock";