import { useState, useMemo, useCallback, useEffect } from "react";
import { AlertTriangle, TrendingUp, Clock, Lightbulb, CheckCircle2, ShieldCheck, Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "../../components/ui/button"; 
import { usePIR } from "../../hooks/usePIR";
import { DashboardCard } from "../../components/dashboard/index";
import { THEME } from "../../constants/projectConstants";
import type { ProjectIssue, ImprovementNote } from "../../types";

import { LogRow } from "../../components/features/report/LogRow";
import { ProjectSidebar } from "../../components/layouts/ProjectSidebar";
import { PIRDetailModal } from "../../components/modals/PIRDetailModal";
import { PIRFormModal } from "../../components/modals/PIRFormModal";

import { ProtectAction } from "../../components/auth/ProtectAction";
import { useTranslation } from "react-i18next";

const normalizeStr = (str?: string) => str ? str.toLowerCase().replace(/[-_]/g, ' ').trim() : '';

export function PostImplementation() {
  const { liveProjects, issues, improvements, loading, addIssue, addImprovement, refresh } = usePIR();
  const { t } = useTranslation();

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProjectIssue | ImprovementNote | null>(null); 
  const [priorityFilter, setPriorityFilter] = useState('all'); 
  const [activeTab, setActiveTab] = useState<'open' | 'in-progress' | 'resolved' | 'improvements'>('open'); 
  const [activeFormModal, setActiveFormModal] = useState<'issue' | 'idea' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (liveProjects && liveProjects.length > 0 && !selectedProject) {
      setSelectedProject(liveProjects[0]);
    }
  }, [liveProjects, selectedProject]);

  const handleItemClick = useCallback((item: ProjectIssue | ImprovementNote) => setSelectedItem(item), []);

  const handleUpdateSelectedItemStatus = useCallback((newStatus: string) => {
    setSelectedItem((prev) => prev ? { ...prev, status: newStatus } as ProjectIssue : null);
    refresh(); 
  }, [refresh]);

  const navigateToTab = (tab: 'open' | 'in-progress' | 'resolved' | 'improvements') => {
    setActiveTab(tab);
    setPriorityFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const filteredList = useMemo(() => {
    if (!selectedProject) return [];
    const combinedLogs = [...issues, ...improvements] as (ProjectIssue | ImprovementNote)[];
    const q = searchQuery.toLowerCase().trim();
    
    return combinedLogs.filter(logItem => {
      const itemProjectId = (logItem as any).projectId || (logItem as any).project?.id;
      if (itemProjectId !== selectedProject.id) return false;

      const itemStatus = normalizeStr('status' in logItem ? logItem.status : '');
      const itemPriority = normalizeStr('priority' in logItem ? logItem.priority : '');
      
      if (activeTab === 'improvements' && logItem.type !== 'improvement') return false;
      if (activeTab !== 'improvements' && logItem.type === 'improvement') return false;
      if (activeTab === 'open' && itemStatus !== 'open') return false;
      if (activeTab === 'in-progress' && itemStatus !== 'in progress') return false;
      if (activeTab === 'resolved' && itemStatus !== 'resolved') return false;
      
      if (priorityFilter !== 'all' && itemPriority !== priorityFilter.toLowerCase()) return false;

      // Search filter — match title, code/ID (issueId, noteId, code, numeric id), reportedBy, reviewer, developer, description, recommendations, impactArea
      if (q) {
        const rawQ = q;
        const normQ = normalizeStr(q);
        const cleanQ = q.replace(/[^a-z0-9]/g, '');

        const searchTargets: string[] = [
          String((logItem as any).id || ''),
          String((logItem as any).issueId || ''),
          String((logItem as any).noteId || ''),
          String((logItem as any).code || ''),
          String((logItem as any).title || ''),
          String((logItem as any).description || ''),
          String((logItem as any).feedback || ''),
          String((logItem as any).recommendations || ''),
          String((logItem as any).reportedBy || ''),
          String((logItem as any).reviewer || ''),
          String((logItem as any).developer || ''),
          String((logItem as any).impactArea || ''),
          String((logItem as any).category || ''),
          String((logItem as any).priority || ''),
          String((logItem as any).status || ''),
        ];

        const isMatched = searchTargets.some(target => {
          if (!target) return false;
          const lower = target.toLowerCase();
          if (lower.includes(rawQ)) return true;
          if (normalizeStr(lower).includes(normQ)) return true;
          if (cleanQ && lower.replace(/[^a-z0-9]/g, '').includes(cleanQ)) return true;
          return false;
        });

        if (!isMatched) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.type === 'improvement' ? (a as ImprovementNote).createdDate : (a as ProjectIssue).reportedDate).getTime();
      const dateB = new Date(b.type === 'improvement' ? (b as ImprovementNote).createdDate : (b as ProjectIssue).reportedDate).getTime();
      return dateB - dateA;
    });
  }, [issues, improvements, priorityFilter, activeTab, selectedProject, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const projectStats = useMemo(() => {
    if (!selectedProject) return { criticalCount: 0, inProgressCount: 0, openCount: 0, resolvedCount: 0, improvementCount: 0 };
    const projectIssues = issues.filter(i => (i as any).projectId === selectedProject.id || (i as any).project?.id === selectedProject.id);
    const projectImprovements = improvements.filter(i => (i as any).projectId === selectedProject.id || (i as any).project?.id === selectedProject.id);

    return {
      criticalCount: projectIssues.filter(issue => normalizeStr(issue.priority) === "critical" && normalizeStr(issue.status) !== 'resolved').length,
      inProgressCount: projectIssues.filter(issue => normalizeStr(issue.status) === 'in progress').length,
      openCount: projectIssues.filter(issue => normalizeStr(issue.status) === 'open').length, 
      resolvedCount: projectIssues.filter(issue => normalizeStr(issue.status) === 'resolved').length,
      improvementCount: projectImprovements.length
    };
  }, [issues, improvements, selectedProject]);

  const cardConfig = useMemo(() => {
    switch (activeTab) {
      case 'resolved': return { color: THEME.BSI_GREEN, icon: CheckCircle2, title: t('pir.cardTitles.resolved'), textColor: THEME.BSI_GREEN };
      case 'improvements': return { color: THEME.TOSCA, icon: Lightbulb, title: t('pir.cardTitles.improvements'), textColor: THEME.TOSCA };
      case 'in-progress': return { color: "#0284C7", icon: Clock, title: t('pir.cardTitles.inProgress'), textColor: "#0284C7" };
      case 'open': default: return { color: "#E11D48", icon: AlertTriangle, title: t('pir.cardTitles.open'), textColor: "#E11D48" };
    }
  }, [activeTab, t]);

  if (loading && liveProjects.length === 0) {
    return <div className="h-screen flex items-center justify-center font-bold animate-pulse text-lg" style={{ color: THEME.TOSCA }}>{t('pir.loading')}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 text-left relative">
      
      {/* HEADER PAGE (Hanya Text Judul, Tanpa Tombol) */}
      <div className="flex flex-col gap-1 mb-8 pb-2">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 drop-shadow-xs">
          <ShieldCheck className="h-6 w-6 text-white" /> 
          {t('pir.title')}
        </h2>
        <p className="text-sm font-medium text-white/90 drop-shadow-xs">
          {t('pir.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR COMPONENT */}
        <ProjectSidebar 
          title={t('pir.sidebarTitle')}
          projects={liveProjects}
          selectedProject={selectedProject}
          onProjectSelect={(project) => {
            setSelectedProject(project);
            setActiveTab('open'); 
          }}
          emptyStateText={t('pir.noLiveProjects')}
        />

        {/* MAIN CONTENT KANAN */}
        <main className="lg:col-span-3 space-y-6">
          {selectedProject ? (
            <>
              {/* HEADER PROJECT STATS & ACTION BUTTONS */}
              {/* HEADER PROJECT STATS & ACTION BUTTONS */}
              <div className="border border-white/20 shadow-xl bg-white/10 backdrop-blur-md rounded-2xl p-6 overflow-hidden">
                {/* Title di Kiri, Buttons di Kanan */}
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                  
                  {/* Bagian Kiri: Title & Stats */}
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white drop-shadow-xs mb-3">{selectedProject.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs font-bold mt-2 uppercase tracking-wider items-center">
                      <span 
                        onClick={() => navigateToTab('open')} 
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl cursor-pointer transition-all ${
                          activeTab === 'open' 
                            ? 'bg-rose-500/30 text-rose-100 border border-rose-400/50 shadow-sm font-black' 
                            : 'bg-white/10 text-rose-200 hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-300"/> {projectStats.openCount} {t('pir.stats.open')}
                      </span>
                      <span 
                        onClick={() => navigateToTab('in-progress')} 
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl cursor-pointer transition-all ${
                          activeTab === 'in-progress' 
                            ? 'bg-sky-500/30 text-sky-100 border border-sky-400/50 shadow-sm font-black' 
                            : 'bg-white/10 text-sky-200 hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 text-sky-300"/> {projectStats.inProgressCount} {t('pir.stats.inProgress')}
                      </span>
                      <span 
                        onClick={() => navigateToTab('resolved')} 
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl cursor-pointer transition-all ${
                          activeTab === 'resolved' 
                            ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/50 shadow-sm font-black' 
                            : 'bg-white/10 text-emerald-200 hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300"/> {projectStats.resolvedCount} {t('pir.tabs.resolved')}
                      </span>
                      <span 
                        onClick={() => navigateToTab('improvements')} 
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl cursor-pointer transition-all ${
                          activeTab === 'improvements' 
                            ? 'bg-amber-500/30 text-amber-100 border border-amber-400/50 shadow-sm font-black' 
                            : 'bg-white/10 text-amber-200 hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        <TrendingUp className="h-3.5 w-3.5 text-amber-300"/> {projectStats.improvementCount} {t('pir.stats.ideas')}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Action */}
                  <ProtectAction>
                    <div className="flex items-center gap-3 shrink-0">
                      <Button 
                        onClick={() => setActiveFormModal('issue')} 
                        className="h-10 gap-2 text-white bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md font-bold rounded-xl transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
                      >
                        <AlertTriangle className="h-4 w-4 text-rose-300" /> {t('pir.buttons.reportIssue')}
                      </Button>
                      <Button 
                        onClick={() => setActiveFormModal('idea')} 
                        className="h-10 gap-2 text-white shadow-lg shadow-amber-950/20 bg-gradient-to-r from-[#F8AD3C] to-[#F59E0B] hover:brightness-110 transition-all font-extrabold rounded-xl border border-amber-300/30 hover:scale-[1.02] cursor-pointer" 
                      >
                        <Lightbulb className="h-4 w-4 text-amber-100" /> {t('pir.buttons.addIdea')}
                      </Button>
                    </div>
                  </ProtectAction>

                </div>
              </div>

              {/* TABS & LIST ISSUES */}
              <div className="space-y-4">
                <div className="flex w-full border-b border-white/25">
                  {['open', 'in-progress', 'resolved', 'improvements'].map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button 
                        key={tab} 
                        onClick={() => navigateToTab(tab as any)} 
                        className={`flex-1 text-center py-3 px-2 text-xs sm:text-sm font-bold transition-all capitalize cursor-pointer border-b-2 ${
                          isActive 
                            ? 'text-white font-black border-[#F8AD3C] drop-shadow-xs' 
                            : 'text-white/70 hover:text-white border-transparent hover:border-white/30'
                        }`} 
                      >
                        {t(`pir.tabs.${tab}`)}
                      </button>
                    );
                  })}
                </div>

                {/* SEARCH BAR */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder={t('pir.search.placeholder')}
                    className="w-full h-11 pl-10 pr-10 text-sm border border-white/25 rounded-2xl bg-white/15 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/60 focus:bg-white/25 placeholder-white/65 text-white font-medium transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <DashboardCard className="h-fit shadow-xl shadow-teal-950/5 border border-white/60" color={cardConfig.color} icon={cardConfig.icon} title={<span className="text-lg font-bold uppercase tracking-wide" style={{ color: cardConfig.textColor }}>{cardConfig.title}</span>} 
                  headerAction={
                    <div className="flex gap-1.5 flex-wrap">
                      {activeTab !== 'improvements' && ['all', 'critical', 'high', 'medium', 'low'].map(priorityLevel => {
                        const isSelected = priorityFilter === priorityLevel;
                        return (
                          <button 
                            key={priorityLevel} 
                            onClick={() => { setPriorityFilter(priorityLevel); setCurrentPage(1); }} 
                            className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer border ${
                              isSelected 
                                ? 'bg-white shadow-sm ring-1 ring-black/5' 
                                : 'bg-gray-100/70 text-gray-700 hover:bg-gray-200/80 border-gray-200/60'
                            }`} 
                            style={isSelected ? { color: cardConfig.textColor, borderColor: cardConfig.color } : {}}
                          >
                            {t(`pir.priorities.${priorityLevel}`)}
                          </button>
                        );
                      })}
                    </div>
                  } 
                  contentClassName="min-h-[300px] space-y-3 pt-4"
                >
                  {paginatedList.length > 0 
                    ? paginatedList.map(item => <LogRow key={'issueId' in item ? item.issueId : item.noteId} item={item} onClick={handleItemClick} />) 
                    : (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-sm" style={{ color: THEME.BSI_LIGHT_GRAY }}>
                        <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                        {searchQuery ? t('pir.search.noResults', { query: searchQuery }) : t('pir.noItems')}
                      </div>
                    )}

                  {/* PAGINATION */}
                  {filteredList.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-gray-100 select-none">
                      {/* Range & Page Size */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          {t('pir.pagination.showing')}{' '}
                          <strong className="text-gray-800">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredList.length)}</strong>
                          {' '}{t('pir.pagination.of')}{' '}
                          <strong className="text-gray-800">{filteredList.length}</strong> {t('pir.pagination.data')}
                        </span>
                        <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                          <span className="text-gray-400">{t('pir.pagination.rows')}</span>
                          <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#36A39D] cursor-pointer"
                          >
                            {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt} {t('pir.pagination.perPage')}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Page buttons */}
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title={t('pir.pagination.first')} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all">
                          <ChevronsLeft className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} title={t('pir.pagination.previous')} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>

                        {/* Smart ellipsis page numbers */}
                        {(() => {
                          const pages: (number | string)[] = [];
                          if (totalPages <= 5) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else if (currentPage <= 3) {
                            pages.push(1, 2, 3, 4, '...', totalPages);
                          } else if (currentPage >= totalPages - 2) {
                            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                          } else {
                            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                          }
                          return pages.map((p, idx) =>
                            p === '...' ? (
                              <span key={`e-${idx}`} className="px-1.5 text-xs text-gray-400">···</span>
                            ) : (
                              <button
                                key={`pg-${p}`}
                                onClick={() => setCurrentPage(Number(p))}
                                style={p === currentPage ? { backgroundColor: THEME.TOSCA, color: '#fff', borderColor: THEME.TOSCA } : {}}
                                className={`h-8 min-w-[32px] px-2 text-xs font-bold rounded-lg border transition-all ${p === currentPage ? '' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                              >
                                {p}
                              </button>
                            )
                          );
                        })()}

                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} title={t('pir.pagination.next')} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title={t('pir.pagination.last')} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-all">
                          <ChevronsRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </DashboardCard>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-100">
              <ShieldCheck className="h-16 w-16 mb-4 text-gray-100" />
              <p className="font-bold tracking-tight">{t('pir.emptyState')}</p>
            </div>
          )}
        </main>
      </div>

      <PIRDetailModal selectedItem={selectedItem} onClose={() => setSelectedItem(null)} onActionComplete={refresh} onLocalUpdate={handleUpdateSelectedItemStatus} />
      <PIRFormModal activeModal={activeFormModal} onClose={() => setActiveFormModal(null)} selectedProject={selectedProject} addIssue={addIssue} addImprovement={addImprovement} refresh={refresh} />

    </div>
  );
}