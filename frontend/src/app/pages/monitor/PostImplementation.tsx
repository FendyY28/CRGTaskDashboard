import { useState, useMemo, useCallback } from "react";
import { AlertTriangle, TrendingUp, Clock, Lightbulb, CheckCircle2 } from "lucide-react";
import { usePIR } from "../../hooks/usePIR";
import { DashboardKpiCard, DashboardCard } from "../../components/dashboard/index";
import { THEME } from "../../constants/projectConstants";
import type { ProjectIssue, ImprovementNote } from "../../types";

import { LogRow } from "../../components/features/report/LogRow";
import { PIRDetailModal } from "../../components/features/report/PIRDetailModal";
import { IssueFormCard } from "../../components/features/report/IssueFormCard";
import { IdeaFormCard } from "../../components/features/report/IdeaFormCard";
import { LiveProjectsList } from "../../components/features/report/LiveProjectsList";

export function PostImplementation() {
  const { liveProjects, issues, improvements, loading, addIssue, addImprovement, refresh } = usePIR();

  const [selectedItem, setSelectedItem] = useState<ProjectIssue | ImprovementNote | null>(null); 
  const [priorityFilter, setPriorityFilter] = useState('all'); 
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'improvements'>('active'); 

  const handleItemClick = useCallback((item: ProjectIssue | ImprovementNote) => setSelectedItem(item), []);

  const handleUpdateSelectedItemStatus = useCallback((newStatus: string) => {
    setSelectedItem((prevItem) => {
      if (!prevItem) return null;
      // Update status pada state lokal agar Modal langsung berubah tampilannya
      return { ...prevItem, status: newStatus } as ProjectIssue;
    });
    refresh(); 
  }, [refresh]);

  const filteredList = useMemo(() => {
    const combinedLogs = [...issues, ...improvements] as (ProjectIssue | ImprovementNote)[];
    
    return combinedLogs
      .filter(logItem => {
        const itemStatus = 'status' in logItem ? logItem.status : '';
        const isResolved = itemStatus === 'resolved'; 
        
        if (activeTab === 'improvements' && logItem.type !== 'improvement') return false;
        if (activeTab === 'resolved' && (logItem.type === 'improvement' || !isResolved)) return false; 
        if (activeTab === 'active' && (logItem.type === 'improvement' || isResolved)) return false;
        
        return priorityFilter === 'all' || logItem.priority === priorityFilter;
      })
      .sort((a, b) => {
        const dateA = new Date(a.type === 'improvement' ? (a as ImprovementNote).createdDate : (a as ProjectIssue).reportedDate).getTime();
        const dateB = new Date(b.type === 'improvement' ? (b as ImprovementNote).createdDate : (b as ProjectIssue).reportedDate).getTime();
        return dateB - dateA;
      });
  }, [issues, improvements, priorityFilter, activeTab]);

  const dashboardStats = useMemo(() => ({
    criticalCount: issues.filter(issue => issue.priority === "CRITICAL" && issue.status !== 'RESOLVED').length,
    inProgressCount: issues.filter(issue => issue.status === 'IN_PROGRESS').length,
    openCount: issues.filter(issue => issue.status === 'OPEN').length, 
    improvementCount: improvements.length
  }), [issues, improvements]);

  const cardConfig = useMemo(() => {
    switch (activeTab) {
      case 'resolved': return { color: THEME.BSI_GREEN, icon: CheckCircle2, title: "Resolved Archive", textColor: THEME.BSI_GREEN };
      case 'improvements': return { color: THEME.TOSCA, icon: Lightbulb, title: "Optimization Ideas", textColor: THEME.TOSCA };
      default: return { color: "#E11D48", icon: AlertTriangle, title: "Active Issue Log", textColor: "#E11D48" };
    }
  }, [activeTab]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse" style={{ color: THEME.TOSCA }}>Initializing PIR Module...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-1 text-left mb-2">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Post Implementation Review</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {[ 
          { label: "Critical Issues", count: dashboardStats.criticalCount, icon: AlertTriangle, color: "#7C2D12", filterValue: 'critical', targetTab: 'active' as const }, 
          { label: "In-Progress Issues", count: dashboardStats.inProgressCount, icon: Clock, color: "#0284C7", filterValue: 'all', targetTab: 'active' as const },
          { label: "Open Issues", count: dashboardStats.openCount, icon: Clock, color: THEME.BSI_YELLOW, filterValue: 'all', targetTab: 'active' as const }, 
          { label: "Improvements", count: dashboardStats.improvementCount, icon: TrendingUp, color: THEME.TOSCA, filterValue: 'all', targetTab: 'improvements' as const } 
        ].map((config, index) => (
          <DashboardKpiCard 
            key={index} 
            label={config.label} 
            count={config.count} 
            icon={config.icon} 
            color={config.color} 
            onClick={() => { setPriorityFilter(config.filterValue); setActiveTab(config.targetTab); }} 
            active={priorityFilter === config.filterValue && activeTab === config.targetTab} 
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        <div className="xl:col-span-2 space-y-4">
          <div className="flex border-b border-gray-200">
            {['active', 'resolved', 'improvements'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => { setActiveTab(tab as any); setPriorityFilter('all'); }} 
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? '' : 'border-transparent'}`}
                style={activeTab === tab ? { color: cardConfig.textColor, borderColor: cardConfig.color } : { color: THEME.BSI_GREY }}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          <DashboardCard 
            className="h-fit shadow-sm ring-1 ring-gray-200" 
            color={cardConfig.color} 
            icon={cardConfig.icon} 
            title={<span className="text-lg font-bold uppercase tracking-wide" style={{ color: cardConfig.textColor }}>{cardConfig.title}</span>} 
            headerAction={
                <div className="flex gap-1.5">
                    {activeTab !== 'improvements' && ['all', 'critical', 'high', 'medium', 'low'].map(priorityLevel => 
                        <button 
                            key={priorityLevel} 
                            onClick={() => setPriorityFilter(priorityLevel)} 
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg capitalize border ${priorityFilter === priorityLevel ? 'bg-white shadow-sm' : 'border-transparent'}`}
                            style={priorityFilter === priorityLevel ? { color: cardConfig.textColor, borderColor: cardConfig.color } : { color: THEME.BSI_GREY }}
                        >
                            {priorityLevel}
                        </button>
                    )}
                </div>
            } 
            contentClassName="min-h-[400px] space-y-3 pt-4"
          >
            {filteredList.length > 0 
              ? filteredList.map(item => <LogRow key={'issueId' in item ? item.issueId : item.noteId} item={item} onClick={handleItemClick} />) 
              : <div className="p-20 text-center text-sm" style={{ color: THEME.BSI_LIGHT_GRAY }}>No items found.</div>}
          </DashboardCard>
        </div>

        <div className="space-y-6 sticky top-6 h-fit text-left">
          <LiveProjectsList projects={liveProjects} />
          
          <IssueFormCard 
            liveProjects={liveProjects} 
            onSubmitIssue={addIssue} 
          />
          <IdeaFormCard 
            liveProjects={liveProjects} 
            onSubmitImprovement={addImprovement} 
          />
        </div>
      </div>

      <PIRDetailModal 
        selectedItem={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onActionComplete={refresh} 
        onLocalUpdate={handleUpdateSelectedItemStatus}
      />
    </div>
  );
}