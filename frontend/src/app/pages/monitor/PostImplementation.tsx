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
  // 🔥 Ekstrak semua yang dibutuhkan dari hook di level Induk
  const { liveProjects, issues, improvements, loading, addIssue, addImprovement, refresh } = usePIR();

  const [selectedItem, setSelectedItem] = useState<ProjectIssue | ImprovementNote | null>(null); 
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'improvements'>('active'); 

  const handleItemClick = useCallback((item: ProjectIssue | ImprovementNote) => setSelectedItem(item), []);

  const handleUpdateSelectedItemStatus = useCallback((newStatus: string) => {
    setSelectedItem((prev) => {
      if (!prev) return null;
      // Update status pada state lokal agar Modal langsung berubah tampilannya
      return { ...prev, status: newStatus } as ProjectIssue;
    });
    // Refresh data background agar list di dashboard sinkron
    refresh(); 
  }, [refresh]);

  const filteredList = useMemo(() => {
    const combined = [...issues, ...improvements] as (ProjectIssue | ImprovementNote)[];
    return combined
      .filter(i => {
        const itemStatus = 'status' in i ? i.status : '';
        const isResolved = itemStatus === 'resolved'; 
        
        if (activeTab === 'improvements' && i.type !== 'improvement') return false;
        if (activeTab === 'resolved' && (i.type === 'improvement' || !isResolved)) return false; 
        if (activeTab === 'active' && (i.type === 'improvement' || isResolved)) return false;
        return filter === 'all' || i.priority === filter;
      })
      .sort((a, b) => {
        const dateA = new Date(a.type === 'improvement' ? (a as ImprovementNote).createdDate : (a as ProjectIssue).reportedDate).getTime();
        const dateB = new Date(b.type === 'improvement' ? (b as ImprovementNote).createdDate : (b as ProjectIssue).reportedDate).getTime();
        return dateB - dateA;
      });
  }, [issues, improvements, filter, activeTab]);

  const stats = useMemo(() => ({
    critical: issues.filter(i => i.priority === "critical" && i.status !== 'resolved').length,
    high: issues.filter(i => i.priority === "high" && i.status !== 'resolved').length,
    open: issues.filter(i => i.status === 'open').length, 
    improvements: improvements.length
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
          { l: "Critical Issues", c: stats.critical, i: AlertTriangle, clr: "#7C2D12", f: 'critical', tab: 'active' as const }, 
          { l: "High Priority", c: stats.high, i: AlertTriangle, clr: "#E11D48", f: 'high', tab: 'active' as const }, 
          { l: "Open Issues", c: stats.open, i: Clock, clr: THEME.BSI_YELLOW, f: 'all', tab: 'active' as const }, 
          { l: "Improvements", c: stats.improvements, i: TrendingUp, clr: THEME.TOSCA, f: 'all', tab: 'improvements' as const } 
        ].map((k, i) => (
          <DashboardKpiCard key={i} label={k.l} count={k.c} icon={k.i} color={k.clr} onClick={() => { setFilter(k.f); setActiveTab(k.tab); }} active={filter === k.f && activeTab === k.tab} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        <div className="xl:col-span-2 space-y-4">
          <div className="flex border-b border-gray-200">
            {['active', 'resolved', 'improvements'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => { setActiveTab(tab as any); setFilter('all'); }} 
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
                    {activeTab !== 'improvements' && ['all', 'critical', 'high', 'medium', 'low'].map(s => 
                        <button 
                            key={s} 
                            onClick={() => setFilter(s)} 
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg capitalize border ${filter === s ? 'bg-white shadow-sm' : 'border-transparent'}`}
                            style={filter === s ? { color: cardConfig.textColor, borderColor: cardConfig.color } : { color: THEME.BSI_GREY }}
                        >
                            {s}
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
          
          {/* 🔥 PASSING FUNGSI ADD DARI INDUK KE ANAK */}
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
        // Refresh seluruh data saat modal melakukan action Delete / Update
        onActionComplete={refresh} 
        onLocalUpdate={handleUpdateSelectedItemStatus}
      />
    </div>
  );
}