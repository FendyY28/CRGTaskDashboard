import { Rocket, User } from "lucide-react";
import { Badge } from "../../ui/badge";
import { DashboardCard } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import type { Project } from "../../../types";
import { useTranslation } from "react-i18next";

interface LiveProjectsListProps {
  projects: Project[];
}

export function LiveProjectsList({ projects }: LiveProjectsListProps) {
  const { t } = useTranslation();
  return (
    <DashboardCard color={THEME.BSI_GREEN} title={t('pirComponents.liveProjects.title')} icon={Rocket} contentClassName="space-y-3 pt-4 max-h-[250px] overflow-y-auto custom-scrollbar">
      {projects.length > 0 ? projects.map(p => (
        <div key={p.id} className="p-3 border rounded-xl flex items-center justify-between" style={{ backgroundColor: THEME.BSI_GREEN + '10', borderColor: THEME.BSI_GREEN + '30' }}>
          <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-bold truncate" style={{ color: THEME.BSI_DARK_GRAY }}>{p.name}</span>
              <span className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: THEME.BSI_GREY }}><User className="h-3 w-3" style={{ color: THEME.BSI_GREEN }} /> {p.pic}</span>
          </div>
          <Badge className="bg-white text-[10px] font-bold" style={{ color: THEME.BSI_GREEN, borderColor: THEME.BSI_GREEN + '40' }}>LIVE</Badge>
        </div>
      )) : <div className="text-center p-4 text-xs" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t('pirComponents.liveProjects.noProjects')}</div>}
    </DashboardCard>
  );
}