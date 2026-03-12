import { PlayCircle } from "lucide-react";
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
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
        {title}
      </h3>
      <div className="space-y-2">
        {projects.map((project) => {
          const isSelected = selectedProject?.id === project.id;
          return (
            <div 
              key={project.id} 
              onClick={() => onProjectSelect(project)} 
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                isSelected ? 'bg-white shadow-md ring-1' : 'bg-white border-gray-100 shadow-sm hover:border-gray-300'
              }`}
              style={isSelected ? { borderColor: THEME.TOSCA, boxShadow: `0 0 0 1px ${THEME.TOSCA}1A` } : {}}
            >
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-sm font-bold truncate" style={{ color: isSelected ? THEME.TOSCA : '#1F2937' }}>
                  {project.name}
                </h4>
                {isSelected && <PlayCircle className="h-4 w-4" style={{ color: THEME.TOSCA }} />}
              </div>
            </div>
          );
        })}
        
        {projects.length === 0 && (
          <div className="p-4 text-center text-xs text-gray-400 border border-dashed rounded-xl italic">
            {emptyStateText}
          </div>
        )}
      </div>
    </aside>
  );
}