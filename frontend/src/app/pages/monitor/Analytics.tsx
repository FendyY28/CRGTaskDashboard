import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { Activity, PieChart as PieIcon, BarChart3, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { THEME } from "../../constants/projectConstants"; 
import { DashboardCard } from "../../components/dashboard/index"; 
import { useAnalyticsData } from "../../hooks/useAnalyticsData";

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2.5 rounded-lg shadow-lg border border-gray-100 flex items-center gap-2 text-xs">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></div>
        <p className="font-bold text-gray-700">{payload[0].name}</p>
        <p className="font-black text-gray-900 ml-1">{Math.round(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const CustomAvgProgressTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; 
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs">
        <p className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1">Phase: {label}</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-500 font-medium flex items-center gap-1.5">
               <div className="h-2 w-2 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
               Avg Progress:
            </span>
            <span className="font-black text-gray-900">{data.Average}%</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-500 font-medium flex items-center gap-1.5">
               <Activity className="h-3 w-3 text-gray-400" />
               Active Projects:
            </span>
            <span className="font-black text-gray-900">{data.projectCount}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function Analytics() {
  const { t } = useTranslation();
  const data = useAnalyticsData(); 

  // Warna kustom untuk status bahaya/kritis karena tidak ada di THEME
  const DANGER_COLOR = "#E11D48"; 

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 text-left">
      <div className="flex flex-col gap-1 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" style={{ color: THEME.TOSCA }} /> {t('analytics.title')}
        </h2>
        <p className="text-sm font-medium" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t('analytics.description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Chart 1: Project Health */}
        <DashboardCard color={THEME.TOSCA} title={t('analytics.charts.projectStatus')} icon={PieIcon} contentClassName="p-2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.statusData} cx="50%" cy="40%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {data.statusData.map((entry, index) => {
                  let color : string = THEME.BSI_GREY;
                  if (entry.name.toLowerCase().includes('track')) color = THEME.TOSCA;
                  if (entry.name.toLowerCase().includes('risk')) color = THEME.BSI_YELLOW;
                  if (entry.name.toLowerCase().includes('overdue')) color = DANGER_COLOR;
                  if (entry.name.toLowerCase().includes('complete')) color = THEME.BSI_GREEN;
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </DashboardCard>

        {/* Chart 2: Average Progress */}
        <DashboardCard color={THEME.TOSCA} title={t('analytics.charts.averageProgress')} icon={TrendingUp} contentClassName="p-2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.averageProgressData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip cursor={{fill: '#f3f4f6', radius: 4}} content={<CustomAvgProgressTooltip />} />
              <Bar dataKey="Average" fill={THEME.TOSCA} radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardCard>

        {/* Chart 3: UAT Quality */}
        <DashboardCard color={THEME.BSI_GREEN} title={t('analytics.charts.testingQuality')} icon={CheckCircle2} contentClassName="p-2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.uatData} cx="50%" cy="40%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {data.uatData.map((entry, index) => {
                  let color: string = THEME.BSI_GREY;
                  if (entry.name.toLowerCase().includes('pass')) color = THEME.BSI_GREEN;
                  if (entry.name.toLowerCase().includes('fail')) color = DANGER_COLOR;
                  if (entry.name.toLowerCase().includes('pending')) color = THEME.BSI_YELLOW;
                  if (entry.name.toLowerCase().includes('takeout')) color = THEME.BSI_LIGHT_GRAY;
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </DashboardCard>
        
        {/* Chart 4: Top Defects */}
        <DashboardCard color={DANGER_COLOR} title={t('analytics.charts.topDefects') || "Top Failed Projects"} icon={AlertTriangle} contentClassName="p-2 h-[280px]">
          {data.topDefectsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topDefectsData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px' }} />
                <Bar dataKey="Fails" radius={[0, 4, 4, 0]} barSize={14}>
                  {data.topDefectsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? DANGER_COLOR : THEME.BSI_YELLOW} /> 
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs font-medium">No defects detected</div>}
        </DashboardCard>

        {/* Chart 5: Issue Resolution Tracking */}
        <DashboardCard color={THEME.BSI_GREEN} title={t('analytics.charts.issueResolution')} icon={Activity} contentClassName="p-2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.issueResolutionData} cx="50%" cy="40%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {data.issueResolutionData.map((entry, index) => {
                  let color = DANGER_COLOR;
                  if (entry.name.toLowerCase().includes(t('pir.tabs.resolved').toLowerCase()) || entry.name.toLowerCase().includes('resolve')) color = THEME.BSI_GREEN;
                  if (entry.name.toLowerCase().includes(t('pir.tabs.in-progress').toLowerCase()) || entry.name.toLowerCase().includes('progress')) color = THEME.ORANGE;
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </DashboardCard>

        {/* Chart 6: Live Issues by Priority */}
        <DashboardCard color={DANGER_COLOR} title={t('analytics.charts.issuePriority')} icon={AlertTriangle} contentClassName="p-2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.issueData} layout="vertical" margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px' }} />
              <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
              <Bar dataKey={data.openLbl} fill={DANGER_COLOR} radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey={data.inProgressLbl} fill={THEME.ORANGE} radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardCard>

      </div>
    </div>
  );
}