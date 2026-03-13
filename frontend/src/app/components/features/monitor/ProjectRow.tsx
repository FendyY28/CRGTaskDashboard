import { memo } from "react";
import { Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { StatusBadge } from "../../dashboard/index"; 
import type { Project } from "../../../types";
import { ProtectAction } from "../../auth/ProtectAction"; 

interface ProjectRowProps {
  proj: Project;
  onEdit: (proj: Project) => void;
  onDelete: (id: string) => void;
}

export const ProjectRow = memo(({ proj, onEdit, onDelete }: ProjectRowProps) => (
  <div className="flex items-center justify-between p-4 bg-gray-50/30 rounded-xl border border-gray-100 group/item hover:border-[#36A39D]/30 hover:bg-[#36A39D]/5 transition-all">
    <div className="flex-1 min-w-0 pr-4 text-left">
      <p className="text-sm font-bold text-gray-800 truncate group-hover/item:text-[#36A39D] transition-colors">
        {proj.name}
      </p>
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1.5 mt-1">
        <Users className="h-3 w-3 text-[#F9AD3C]"/> {proj.pic || "Unassigned"}
      </p>
    </div>
    
    <div className="flex items-center gap-4 shrink-0">
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-black text-gray-700">{proj.overallProgress}%</span>
        <StatusBadge value={proj.status} />
      </div>

      <ProtectAction>
        <div className="flex items-center gap-1 border-l pl-3 ml-2 border-gray-200">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-[#36A39D] hover:bg-white" 
            onClick={() => onEdit(proj)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-white" 
            onClick={() => onDelete(proj.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </ProtectAction>
    </div>
  </div>
));

ProjectRow.displayName = "ProjectRow";