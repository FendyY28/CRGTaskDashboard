import { useState, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity, Filter, CheckSquare, Square, X, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { THEME } from "../../constants/projectConstants";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
  useKeywordColorResolver,
  type ChartColorResolver,
  type ChartTooltipProps,
} from "./analyticsCharts";

/** A project option shown in the analytics filter dropdown. */
export interface ProjectOption {
  id: string;
  name: string;
}

/** One slice of a category pie chart. */
export interface CategoryDatum {
  name: string;
  value: number;
}

// --- TOOLTIPS ---------------------------------------------------------------

export const CustomPieTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2.5 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3 text-xs animate-in zoom-in-95 duration-200">
        <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload?.color }}></div>
        <p className="font-bold text-gray-700">{payload[0].name}</p>
        <p className="font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{Math.round(payload[0].value ?? 0)}</p>
      </div>
    );
  }
  return null;
};

export const CustomAvgProgressTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload ?? {};
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
          <div>
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

// --- CHART PRIMITIVES -------------------------------------------------------

interface CategoryPieProps {
  data: CategoryDatum[];
  resolveColor: ChartColorResolver;
}

/**
 * Donut chart used by every categorical breakdown on the analytics page.
 * Slices are coloured through `resolveColor`, so each caller supplies its own
 * label -> colour rules instead of repeating the whole recharts tree.
 */
export function CategoryPie({ data, resolveColor }: CategoryPieProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="40%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={resolveColor(entry.name)} />
          ))}
        </Pie>
        <Tooltip content={<CustomPieTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={40}
          iconType="circle"
          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// --- COLOUR RULES -----------------------------------------------------------

/** Colour rules for the project-health pie. */
export function useStatusColorResolver() {
  return useKeywordColorResolver(
    [
      { keywords: ['complete'], color: THEME.BSI_GREEN },
      { keywords: ['overdue'], color: '#E11D48' },
      { keywords: ['risk'], color: THEME.BSI_YELLOW },
      { keywords: ['track'], color: THEME.TOSCA },
    ],
    THEME.BSI_GREY,
    'status',
  );
}

/** Colour rules for the UAT quality pie. */
export function useUatColorResolver(takeoutLabel: string) {
  return useKeywordColorResolver(
    [
      { keywords: ['pass'], color: THEME.BSI_GREEN },
      { keywords: ['fail'], color: '#E11D48' },
      { keywords: ['pending'], color: THEME.BSI_YELLOW },
      { keywords: [takeoutLabel, 'takeout'], color: THEME.BSI_LIGHT_GRAY },
    ],
    THEME.BSI_GREY,
    `uat-${takeoutLabel}`,
  );
}

/** Colour rules for the issue-resolution pie. */
export function useIssueResolutionColorResolver(resolvedLabel: string, inProgressLabel: string) {
  return useKeywordColorResolver(
    [
      { keywords: [resolvedLabel, 'resolve'], color: THEME.BSI_GREEN },
      { keywords: [inProgressLabel, 'progress'], color: THEME.ORANGE },
    ],
    '#E11D48',
    `resolution-${resolvedLabel}-${inProgressLabel}`,
  );
}

// --- FILTER DROPDOWN --------------------------------------------------------

interface ProjectFilterDropdownProps {
  availableProjects: ProjectOption[];
  selectedProjects: string[];
  onToggle: (projectId: string) => void;
  onReset: () => void;
}

/** Multi-select project filter used above the analytics charts. */
export function ProjectFilterDropdown({
  availableProjects,
  selectedProjects,
  onToggle,
  onReset,
}: ProjectFilterDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterRef, () => setIsOpen(false));

  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return availableProjects.filter((p) => p.name.toLowerCase().includes(query));
  }, [availableProjects, searchQuery]);

  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-11 px-5 bg-white/95 backdrop-blur-md border border-white/60 shadow-lg shadow-teal-950/5 rounded-xl font-bold transition-all hover:bg-white hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/40 cursor-pointer"
        style={selectedProjects.length > 0 ? {
          borderColor: THEME.TOSCA,
          color: THEME.TOSCA,
          backgroundColor: '#FFFFFF',
        } : { color: '#1F2937' }}
      >
        <Filter className="h-4 w-4" />
        {selectedProjects.length === 0
          ? t('analytics.filter.allProjects', 'All Projects')
          : t('analytics.filter.selected', { count: selectedProjects.length })}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">

          <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> {t('analytics.filter.title', 'Filter Chart')}
            </span>
            {selectedProjects.length > 0 && (
              <button
                onClick={onReset}
                className="text-label font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" /> {t('analytics.filter.reset', 'RESET')}
              </button>
            )}
          </div>

          <div className="p-3 border-b border-gray-50 bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={t('analytics.filter.searchPlaceholder', 'Search projects...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50/50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((proj) => {
                const isSelected = selectedProjects.length === 0 || selectedProjects.includes(proj.id);
                return (
                  <div
                    key={proj.id}
                    onClick={() => onToggle(proj.id)}
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
            {availableProjects.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400 italic">
                {t('analytics.filter.noProjects', 'No projects available')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- BAR CHART CARDS --------------------------------------------------------

export interface AverageProgressDatum {
  name: string;
  Average: number;
  projectCount: number;
}

/** Vertical bars: average progress per SDLC phase. */
export function AverageProgressChart({ data }: { data: AverageProgressDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip cursor={{ fill: '#f3f4f6', radius: 4 }} content={<CustomAvgProgressTooltip />} />
        <Bar dataKey="Average" fill={THEME.TOSCA} radius={[4, 4, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars: number of failed test cases per project (top 5). */
export function TopDefectsChart({ data }: { data: { name: string; Fails: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} width={80} />
        <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Bar dataKey="Fails" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? '#E11D48' : THEME.BSI_YELLOW} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface IssuePriorityDatum {
  name: string;
  [key: string]: number | string;
}

interface IssuePriorityChartProps {
  data: IssuePriorityDatum[];
  openLabel: string;
  inProgressLabel: string;
}

/** Horizontal bars: live issues per priority, split by open/in-progress. */
export function IssuePriorityChart({ data, openLabel, inProgressLabel }: IssuePriorityChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: THEME.BSI_GREY }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
        <Bar dataKey={openLabel} fill="#E11D48" radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey={inProgressLabel} fill={THEME.ORANGE} radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}
