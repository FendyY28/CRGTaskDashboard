import { useState, useMemo, useCallback, useEffect } from "react";
import { AlertTriangle, TrendingUp, Clock, Lightbulb, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
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
  };

  const filteredList = useMemo(() => {
    if (!selectedProject) return [];
    const combinedLogs = [...issues, ...improvements] as (ProjectIssue | ImprovementNote)[];
    
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
      
      return priorityFilter === 'all' || itemPriority === priorityFilter.toLowerCase();
    }).sort((a, b) => {
      const dateA = new Date(a.type === 'improvement' ? (a as ImprovementNote).createdDate : (a as ProjectIssue).reportedDate).getTime();
      const dateB = new Date(b.type === 'improvement' ? (b as ImprovementNote).createdDate : (b as ProjectIssue).reportedDate).getTime();
      return dateB - dateA;
    });
  }, [issues, improvements, priorityFilter, activeTab, selectedProject]);

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
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" style={{ color: THEME.TOSCA }} /> 
          {t('pir.title')}
        </h2>
        <p className="text-sm font-medium" style={{ color: THEME.BSI_LIGHT_GRAY }}>
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
              <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  {/* Flex Header Card: Title di Kiri, Buttons di Kanan */}
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    
                    {/* Bagian Kiri: Title & Stats */}
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900 mb-3">{selectedProject.name}</h3>
                      <div className="flex flex-wrap gap-3 text-xs font-bold mt-2 uppercase tracking-wider items-center">
                        <span onClick={() => navigateToTab('open')} className={`text-[#E11D48] flex items-center gap-1 cursor-pointer hover:opacity-80 transition-all ${activeTab === 'open' ? 'underline underline-offset-4 decoration-2' : ''}`}>
                          <AlertTriangle className="h-3 w-3"/> {projectStats.openCount} {t('pir.stats.open')}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span onClick={() => navigateToTab('in-progress')} className={`text-[#0284C7] flex items-center gap-1 cursor-pointer hover:opacity-80 transition-all ${activeTab === 'in-progress' ? 'underline underline-offset-4 decoration-2' : ''}`}>
                          <Clock className="h-3 w-3"/> {projectStats.inProgressCount} {t('pir.stats.inProgress')}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span onClick={() => navigateToTab('resolved')} className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-all ${activeTab === 'resolved' ? 'underline underline-offset-4 decoration-2' : ''}`} style={{ color: THEME.BSI_GREEN }}>
                          <CheckCircle2 className="h-3 w-3"/> {projectStats.resolvedCount} {t('pir.tabs.resolved')}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span onClick={() => navigateToTab('improvements')} className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-all ${activeTab === 'improvements' ? 'underline underline-offset-4 decoration-2' : ''}`} style={{ color: THEME.TOSCA }}>
                          <TrendingUp className="h-3 w-3"/> {projectStats.improvementCount} {t('pir.stats.ideas')}
                        </span>
                      </div>
                    </div>

                    {/* 🔥 Bagian Kanan: Tombol Action (Pindah ke sini) */}
                    <ProtectAction>
                      <div className="flex items-center gap-3 shrink-0">
                        <Button 
                          onClick={() => setActiveFormModal('issue')} 
                          variant="outline" 
                          className="h-10 gap-2 text-[#E11D48] border-[#E11D48]/30 hover:bg-[#E11D48]/10 bg-white shadow-sm font-bold rounded-xl"
                        >
                          <AlertTriangle className="h-4 w-4" /> {t('pir.buttons.reportIssue')}
                        </Button>
                        <Button 
                          onClick={() => setActiveFormModal('idea')} 
                          className="h-10 gap-2 text-white shadow-md hover:brightness-95 transition-all font-bold rounded-xl" 
                          style={{ backgroundColor: THEME.TOSCA }}
                        >
                          <Lightbulb className="h-4 w-4" /> {t('pir.buttons.addIdea')}
                        </Button>
                      </div>
                    </ProtectAction>

                  </div>
                </CardContent>
              </Card>

              {/* TABS & LIST ISSUES */}
              <div className="space-y-4">
                <div className="flex border-b border-gray-200">
                  {['open', 'in-progress', 'resolved', 'improvements'].map((tab) => (
                    <button key={tab} onClick={() => navigateToTab(tab as any)} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? '' : 'border-transparent hover:border-gray-300'}`} style={activeTab === tab ? { color: cardConfig.textColor, borderColor: cardConfig.color } : { color: THEME.BSI_GREY }}>
                      {t(`pir.tabs.${tab}`)}
                    </button>
                  ))}
                </div>

                <DashboardCard className="h-fit shadow-sm ring-1 ring-gray-200" color={cardConfig.color} icon={cardConfig.icon} title={<span className="text-lg font-bold uppercase tracking-wide" style={{ color: cardConfig.textColor }}>{cardConfig.title}</span>} 
                  headerAction={
                    <div className="flex gap-1.5">
                      {activeTab !== 'improvements' && ['all', 'critical', 'high', 'medium', 'low'].map(priorityLevel => 
                        <button key={priorityLevel} onClick={() => setPriorityFilter(priorityLevel)} className={`px-3 py-1 text-[10px] font-bold rounded-lg capitalize border transition-all ${priorityFilter === priorityLevel ? 'bg-white shadow-sm' : 'border-transparent hover:bg-gray-50'}`} style={priorityFilter === priorityLevel ? { color: cardConfig.textColor, borderColor: cardConfig.color } : { color: THEME.BSI_GREY }}>
                          {t(`pir.priorities.${priorityLevel}`)}
                        </button>
                      )}
                    </div>
                  } 
                  contentClassName="min-h-[300px] space-y-3 pt-4"
                >
                  {filteredList.length > 0 
                    ? filteredList.map(item => <LogRow key={'issueId' in item ? item.issueId : item.noteId} item={item} onClick={handleItemClick} />) 
                    : (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-sm" style={{ color: THEME.BSI_LIGHT_GRAY }}>
                        <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                        {t('pir.noItems')}
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