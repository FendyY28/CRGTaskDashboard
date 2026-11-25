import { useState } from "react";
import {
  Activity, PieChart as PieIcon, BarChart3, AlertTriangle,
  TrendingUp, CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { THEME } from "../../constants/projectConstants";
import { DashboardCard } from "../../components/dashboard/index";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import {
  AverageProgressChart,
  CategoryPie,
  IssuePriorityChart,
  ProjectFilterDropdown,
  TopDefectsChart,
  useIssueResolutionColorResolver,
  useStatusColorResolver,
  useUatColorResolver,
} from "./analyticsWidgets";

export function Analytics() {
  const { t } = useTranslation();

  // STATE UNTUK FILTER PROJECT
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const data = useAnalyticsData(selectedProjects);
  const DANGER_COLOR = "#E11D48";

  const statusColor = useStatusColorResolver();
  const uatColor = useUatColorResolver(t('testing.row.takenOut') || 'Takeout');
  const issueResolutionColor = useIssueResolutionColorResolver(
    t('pir.tabs.resolved'),
    t('pir.tabs.in-progress'),
  );

  // LOGIC TOGGLE PROJECT
  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const resetFilter = () => setSelectedProjects([]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 text-left">

      {/* HEADER & FILTER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2 drop-shadow-xs">
            <BarChart3 className="h-6 w-6 text-white" /> {t('analytics.title')}
          </h2>
          <p className="text-sm font-medium text-white/90 drop-shadow-xs">{t('analytics.description')}</p>
        </div>

        <ProjectFilterDropdown
          availableProjects={data.availableProjects}
          selectedProjects={selectedProjects}
          onToggle={toggleProject}
          onReset={resetFilter}
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Chart 1: Project Health */}
        <DashboardCard color={THEME.TOSCA} title={t('analytics.charts.projectStatus')} icon={PieIcon} contentClassName="p-2 h-[280px]">
          <CategoryPie data={data.statusData} resolveColor={statusColor} />
        </DashboardCard>

        {/* Chart 2: Average Progress */}
        <DashboardCard color={THEME.TOSCA} title={t('analytics.charts.averageProgress')} icon={TrendingUp} contentClassName="p-2 h-[280px]">
          <AverageProgressChart data={data.averageProgressData} />
        </DashboardCard>

        {/* Chart 3: UAT Quality */}
        <DashboardCard color={THEME.BSI_GREEN} title={t('analytics.charts.testingQuality')} icon={CheckCircle2} contentClassName="p-2 h-[280px]">
          <CategoryPie data={data.uatData} resolveColor={uatColor} />
        </DashboardCard>

        {/* Chart 4: Top Defects */}
        <DashboardCard color={DANGER_COLOR} title={t('analytics.charts.topDefects') || "Top Failed Projects"} icon={AlertTriangle} contentClassName="p-2 h-[280px]">
          {data.topDefectsData.length > 0 ? (
            <TopDefectsChart data={data.topDefectsData} />
          ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs font-medium bg-gray-50/30 rounded-lg m-2 border border-dashed border-gray-200">
            {t('analytics.empty.noDefects', 'No defects detected')}
          </div>}
        </DashboardCard>

        {/* Chart 5: Issue Resolution Tracking */}
        <DashboardCard color={THEME.BSI_GREEN} title={t('analytics.charts.issueResolution')} icon={Activity} contentClassName="p-2 h-[280px]">
          <CategoryPie data={data.issueResolutionData} resolveColor={issueResolutionColor} />
        </DashboardCard>

        {/* Chart 6: Live Issues by Priority */}
        <DashboardCard color={DANGER_COLOR} title={t('analytics.charts.issuePriority')} icon={AlertTriangle} contentClassName="p-2 h-[280px]">
          <IssuePriorityChart
            data={data.issueData}
            openLabel={data.openLbl}
            inProgressLabel={data.inProgressLbl}
          />
        </DashboardCard>

      </div>
    </div>
  );
}
