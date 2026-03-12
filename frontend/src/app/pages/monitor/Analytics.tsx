import { useState, useRef, useEffect, useMemo } from "react";
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  Activity, PieChart as PieIcon, BarChart3, AlertTriangle, 
  TrendingUp, CheckCircle2, Filter, CheckSquare, Square, X, Search 
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { THEME } from "../../constants/projectConstants"; 
import { DashboardCard } from "../../components/dashboard/index"; 
import { useAnalyticsData } from "../../hooks/useAnalyticsData";

// --- TOOLTIPS ---
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2.5 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3 text-xs animate-in zoom-in-95 duration-200">
        <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.color }}></div>
        <p className="font-bold text-gray-700">{payload[0].name}</p>
        <p className="font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{Math.round(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const CustomAvgProgressTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; 
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 text-xs animate-in zoom-in-95 duration-200">
        <p className="font-bold text-gray-800 mb-3 border-b border-gray-50 pb-2 text-sm">Phase: {label}</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center gap-6">
            <span className="text-gray-500 font-medium flex items-center gap-2">
               <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: payload[0].color }}></div>
               Avg Progress:
            </span>
            <span className="font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{data.Average}%</span>
          </div>
          <div className="flex justify-between items-center gap-6">
            <span className="text-gray-500 font-medium flex items-center gap-2">
               <Activity className="h-3 w-3 text-gray-400" />
               Active Projects:
            </span>
            <span className="font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{data.projectCount}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function Analytics() {
  const { t } = useTranslation();
  
  // STATE UNTUK FILTER PROJECT
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); 
  const filterRef = useRef<HTMLDivElement>(null);

  const data = useAnalyticsData(selectedProjects); 
  const DANGER_COLOR = "#E11D48"; 

  // LOGIC KLIK LUAR
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // LOGIC TOGGLE PROJECT
  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    );
  };

  const resetFilter = () => setSelectedProjects([]); 

  // Filter list project berdasarkan search query
  const filteredAvailableProjects = useMemo(() => {
    if (!data.availableProjects) return [];
    return data.availableProjects.filter((p: any) => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data.availableProjects, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 text-left">
      
      {/* HEADER & FILTER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" style={{ color: THEME.TOSCA }} /> {t('analytics.title')}
          </h2>
          <p className="text-sm font-medium" style={{ color: THEME.BSI_LIGHT_GRAY }}>{t('analytics.description')}</p>
        </div>

        {/* CUSTOM PREMIUM FILTER DROPDOWN */}
        <div className="relative" ref={filterRef}>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 h-11 px-5 bg-white border border-gray-200 shadow-sm rounded-xl font-bold transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200"
            style={selectedProjects.length > 0 ? { 
              borderColor: THEME.TOSCA, 
              color: THEME.TOSCA, 
              backgroundColor: `${THEME.TOSCA}0A` 
            } : { color: '#4B5563' }}
          >
            <Filter className="h-4 w-4" />
            {selectedProjects.length === 0 
              ? t('analytics.filter.allProjects', 'All Projects') 
              : t('analytics.filter.selected', { count: selectedProjects.length })}
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              
              <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> {t('analytics.filter.title', 'Filter Chart')}
                </span>
                {selectedProjects.length > 0 && (
                  <button 
                    onClick={resetFilter} 
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> {t('analytics.filter.reset', 'RESET')}
                  </button>
                )}
              </div>

              {/* SEARCH INPUT DALAM DROPDOWN */}
              <div className="p-3 border-b border-gray-50 bg-white">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder={t('analytics.filter.searchPlaceholder', 'Search projects...')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-gray-50/50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:bg-white transition-all"
                    style={{ focusRingColor: THEME.TOSCA } as any}
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                {filteredAvailableProjects.length > 0 ? (
                  filteredAvailableProjects.map((proj: any) => {
                    const isSelected = selectedProjects.length === 0 || selectedProjects.includes(proj.id);
                    return (
                      <div 
                        key={proj.id} 
                        onClick={() => toggleProject(proj.id)}
                        className="flex items-center gap-3 p-3 mx-1 my-0.5 rounded-xl cursor-pointer transition-all hover:bg-gray-50 group"
                        style={isSelected && selectedProjects.length > 0 ? { backgroundColor: `${THEME.TOSCA}1A` } : {}}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" style={{ color: THEME.TOSCA }} />
                        ) : (
                          <Square className="h-5 w-5 text-gray-300 shrink-0 transition-colors group-hover:text-gray-400" />
                        )}
                        <span 
                          className={`text-sm truncate transition-colors ${isSelected && selectedProjects.length > 0 ? 'font-bold' : 'font-medium text-gray-600'}`} 
                          style={isSelected && selectedProjects.length > 0 ? { color: THEME.TOSCA } : {}}
                        >
                          {proj.name}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center flex flex-col items-center justify-center text-gray-400">
                    <Search className="h-6 w-6 mb-2 opacity-20" />
                    <span className="text-xs font-medium">{t('analytics.filter.notFound', 'Project not found')}</span>
                  </div>
                )}
                {(!data.availableProjects || data.availableProjects.length === 0) && (
                  <div className="p-4 text-center text-xs text-gray-400 italic">
                    {t('analytics.filter.noProjects', 'No projects available')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Chart 1: Project Health */}
        <DashboardCard color={THEME.TOSCA} title={t('analytics.charts.projectStatus')} icon={PieIcon} contentClassName="p-2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.statusData} cx="50%" cy="40%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {data.statusData.map((entry: any, index: number) => {
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
                {data.uatData.map((entry: any, index: number) => {
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
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Fails" radius={[0, 4, 4, 0]} barSize={14}>
                  {data.topDefectsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? DANGER_COLOR : THEME.BSI_YELLOW} /> 
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs font-medium bg-gray-50/30 rounded-lg m-2 border border-dashed border-gray-200">
              {t('analytics.empty.noDefects', 'No defects detected')}
            </div>}
        </DashboardCard>

        {/* Chart 5: Issue Resolution Tracking */}
        <DashboardCard color={THEME.BSI_GREEN} title={t('analytics.charts.issueResolution')} icon={Activity} contentClassName="p-2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.issueResolutionData} cx="50%" cy="40%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {data.issueResolutionData.map((entry: any, index: number) => {
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
              <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
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