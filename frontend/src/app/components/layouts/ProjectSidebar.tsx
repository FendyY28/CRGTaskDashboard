import { PlayCircle, FolderKanban } from "lucide-react";
import { THEME } from "../../constants/projectConstants";

interface ProjectSidebarProps {
  title: string;
  projects: any[];
  selectedProject: any | null;
  onProjectSelect: (project: any) => void;
  emptyStateText: string;
}

export function ProjectSidebar({ 
  title, 
  projects, 
  selectedProject, 
  onProjectSelect, 
  emptyStateText 
}: ProjectSidebarProps) {
  
  return (
    <aside className="lg:col-span-1 space-y-4">
      <h3 className="text-xs font-black text-white uppercase tracking-widest px-1 drop-shadow-xs">
        {title}
      </h3>
      <div className="space-y-2">
        {projects.map((project) => {
          const isSelected = selectedProject?.id === project.id;
          return (
            <div 
              key={project.id} 
              onClick={() => onProjectSelect(project)} 
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer backdrop-blur-md ${
                isSelected 
                  ? 'bg-white/25 border-white/50 shadow-lg ring-2 ring-white/30 scale-[1.01]' 
                  : 'bg-white/10 hover:bg-white/20 border-white/20 shadow-sm hover:scale-[1.01]'
              }`}
            >
              <div className="flex justify-between items-center">
                <h4 className={`text-sm truncate ${isSelected ? 'text-white font-black drop-shadow-xs' : 'text-white/90 hover:text-white font-bold drop-shadow-xs'}`}>
                  {project.name}
                </h4>
                {isSelected && <PlayCircle className="h-4 w-4 text-[#F8AD3C] drop-shadow-xs shrink-0 ml-2" />}
              </div>
            </div>
          );
        })}
        
        {projects.length === 0 && (
          <div className="p-5 text-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg space-y-2">
            <div className="mx-auto w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white/80">
              <FolderKanban className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-white/90 drop-shadow-xs leading-snug">
              {emptyStateText}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}