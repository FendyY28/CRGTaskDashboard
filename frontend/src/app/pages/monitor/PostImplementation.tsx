import { useState, useMemo, useCallback, memo } from "react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { 
  AlertTriangle, TrendingUp, PlusCircle, Lightbulb, 
  ChevronRight, Clock, Rocket, User, Calendar, CheckCircle2, Loader2 
} from "lucide-react";

import { toast } from "sonner";
import { usePIR } from "../../hooks/usePIR";
import { capitalize } from "../../../lib/utils";
import { 
  PageHeader, DashboardKpiCard, StatusBadge, DashboardInput, 
  DashboardTextarea, DashboardSelect, DashboardCard 
} from "../../components/dashboard/index";

// Import type eksplisit
import type { ProjectIssue, ImprovementNote } from "../../types";

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

const formatDate = (dateString?: string) => {
  if (!dateString) return "Unknown Date";
  return DATE_FORMATTER.format(new Date(dateString));
};

// --- SUB-COMPONENT: LogRow ---
// Buat tipe gabungan untuk props agar TypeScript tidak bingung
type LogItem = ProjectIssue | ImprovementNote;

const LogRow = memo(({ item, onClick }: { item: LogItem, onClick: (item: LogItem) => void }) => {
  const isImp = item.type === 'improvement';
  
  // Ambil properti secara spesifik berdasarkan tipe
  const reporterName = isImp ? (item as ImprovementNote).reviewer : (item as ProjectIssue).reportedBy;
  const dateReported = isImp ? (item as ImprovementNote).createdDate : (item as ProjectIssue).reportedDate;
  const title = isImp ? "Improvement Plan" : (item as ProjectIssue).title;
  const displayId = isImp ? (item as ImprovementNote).noteId : (item as ProjectIssue).issueId;
  const description = isImp ? (item as ImprovementNote).recommendations : (item as ProjectIssue).description;

  const getSidebarColor = () => {
    if (isImp) return 'border-l-[#36A39D]';
    if (item.priority === 'critical') return 'border-l-[#7C2D12]';
    if (item.priority === 'high') return 'border-l-[#E11D48]';
    return 'border-l-gray-300';
  };

  return (
    <div 
      onClick={() => onClick(item)} 
      className={`p-4 rounded-xl border bg-white border-gray-100 shadow-sm cursor-pointer transition-all duration-200 group hover:shadow-md border-l-4 ${getSidebarColor()}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 overflow-hidden w-full">
          <div className={`mt-1 h-9 w-9 min-w-[36px] rounded-full flex items-center justify-center border-2 ${isImp ? 'border-[#36A39D]/20 bg-[#36A39D]/5 text-[#36A39D]' : 'border-gray-100 bg-gray-50 text-gray-400 group-hover:border-[#E11D48]/30 group-hover:text-[#E11D48]'}`}>
            {isImp ? <Lightbulb className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <div className="overflow-hidden w-full text-left">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900 truncate uppercase">{title}</h4>
                  {item.type === 'issue' && <StatusBadge value={item.priority} />}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-bold text-gray-400">{displayId}</span>
                  <span>•</span>
                  <span className="font-medium text-gray-600">{item.projectName}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#E11D48] transition-transform" />
            </div>
            <p className="text-xs text-gray-500 line-clamp-1 mt-2 pr-8 italic">{description}</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50/50">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wide"><User className="h-3 w-3" /> {reporterName}</span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium"><Calendar className="h-3 w-3" /> {formatDate(dateReported)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
LogRow.displayName = "LogRow";

const INITIAL_ISSUE = { projectId: "", title: "", priority: "medium", description: "" };
const INITIAL_IMP = { projectId: "", description: "" };

export function PostImplementation() {
  const { 
    liveProjects, issues, improvements, loading, 
    addIssue, updateIssueStatus, deleteIssue, addImprovement 
  } = usePIR();

  // 🚀 FIX: Tipe state diperjelas
  const [selectedItem, setSelectedItem] = useState<ProjectIssue | ImprovementNote | null>(null); 
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'improvements'>('active'); 
  const [issueForm, setIssueForm] = useState(INITIAL_ISSUE);
  const [impForm, setImpForm] = useState(INITIAL_IMP);
  const [isBusy, setIsBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // 🚀 FIX: Menyesuaikan parameter tipe callback
  const handleItemClick = useCallback((item: ProjectIssue | ImprovementNote) => setSelectedItem(item), []);

  const handleIssueSubmit = async () => {
    setIsBusy(true);
    const userName = localStorage.getItem('user_name') || "System Admin";
    
    toast.promise(
      addIssue({ 
        ...issueForm, 
        issueId: `ISS-${Date.now().toString().slice(-4)}`,
        impactArea: "General",
        reportedBy: userName,
        reportedDate: new Date().toISOString(),
        status: "open"
      }), 
      {
        loading: 'Reporting issue...',
        success: () => {
          setIssueForm(INITIAL_ISSUE);
          setIsBusy(false);
          return 'Issue reported successfully!';
        },
        error: () => {
          setIsBusy(false);
          return 'Failed to report issue.';
        }
      }
    );
  };

  const handleImprovementSubmit = async () => {
    setIsBusy(true);
    const userName = localStorage.getItem('user_name') || "System Admin";

    toast.promise(
      addImprovement({ 
        ...impForm, 
        noteId: `IMP-${Date.now().toString().slice(-4)}`,
        reviewer: userName, 
        developer: "Team", 
        recommendations: impForm.description, 
        priority: "medium",
        createdDate: new Date().toISOString()
      }),
      {
        loading: 'Submitting optimization plan...',
        success: () => {
          setImpForm(INITIAL_IMP);
          setIsBusy(false);
          return 'Idea submitted successfully!';
        },
        error: () => {
          setIsBusy(false);
          return 'Failed to submit idea.';
        }
      }
    );
  };

  const onUpdateStatus = async (id: number | undefined, status: string) => {
    if (!id) return;
    setIsBusy(true);
    toast.promise(updateIssueStatus(id, status), {
      loading: 'Updating status...',
      success: () => {
        setIsBusy(false);
        // Optimistic UI update
        if (selectedItem) setSelectedItem(prev => prev ? { ...prev, status } : prev);
        return `Status updated to ${status.toUpperCase()}`;
      },
      error: () => {
        setIsBusy(false);
        return 'Status update failed.';
      }
    });
  };

  const onDeleteIssue = async (id: number | undefined) => {
    if (!id) return;
    setIsBusy(true);
    toast.promise(deleteIssue(id), {
      loading: 'Removing issue...',
      success: () => {
        setSelectedItem(null);
        setDeleteConfirm(false);
        setIsBusy(false);
        return 'Issue deleted successfully.';
      },
      error: () => {
        setIsBusy(false);
        return 'Failed to delete issue.';
      }
    });
  };

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
      case 'resolved': return { color: "#10B981", icon: CheckCircle2, title: "Resolved Archive", subtitle: "Completed project issues.", textColor: "text-emerald-600", borderColor: "border-emerald-500" };
      case 'improvements': return { color: "#36A39D", icon: Lightbulb, title: "Optimization Ideas", subtitle: "Improvement proposals.", textColor: "text-[#36A39D]", borderColor: "border-[#36A39D]" };
      default: return { color: "#E11D48", icon: AlertTriangle, title: "Active Issue Log", subtitle: "Ongoing project issues.", textColor: "text-[#E11D48]", borderColor: "border-[#E11D48]" };
    }
  }, [activeTab]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#E11D48] font-bold animate-pulse">Initializing PIR Module...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <PageHeader title="Post Implementation Review" description="Monitoring and Feedback for Live Projects." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {[ 
          { l: "Critical Issues", c: stats.critical, i: AlertTriangle, clr: "#7C2D12", f: 'critical', tab: 'active' as const }, 
          { l: "High Priority", c: stats.high, i: AlertTriangle, clr: "#E11D48", f: 'high', tab: 'active' as const }, 
          { l: "Open Issues", c: stats.open, i: Clock, clr: "#F59E0B", f: 'all', tab: 'active' as const }, 
          { l: "Improvements", c: stats.improvements, i: TrendingUp, clr: "#36A39D", f: 'all', tab: 'improvements' as const } 
        ].map((k, i) => (
          <DashboardKpiCard key={i} label={k.l} count={k.c} icon={k.i} color={k.clr} onClick={() => { setFilter(k.f); setActiveTab(k.tab); }} active={filter === k.f && activeTab === k.tab} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex border-b border-gray-200">
            {['active', 'resolved', 'improvements'].map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab as any); setFilter('all'); }} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? cardConfig.textColor + ' ' + cardConfig.borderColor : 'border-transparent text-gray-500'}`}>
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          <DashboardCard className="h-fit shadow-sm ring-1 ring-gray-200" color={cardConfig.color} icon={cardConfig.icon} title={<div className="flex flex-col text-left"><span className={`text-lg font-bold uppercase tracking-wide ${cardConfig.textColor}`}>{cardConfig.title}</span><p className="text-[10px] text-gray-400">{cardConfig.subtitle}</p></div>} headerAction={<div className="flex gap-1.5">{activeTab !== 'improvements' && ['all', 'critical', 'high', 'medium', 'low'].map(s => <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 text-[10px] font-bold rounded-lg capitalize border ${filter === s ? `bg-white shadow-sm ${cardConfig.textColor} ${cardConfig.borderColor}` : 'border-transparent text-gray-400'}`}>{s}</button>)}</div>} contentClassName="min-h-[400px] space-y-3 pt-4">
            {filteredList.length > 0 ? filteredList.map(item => <LogRow key={'issueId' in item ? item.issueId : item.noteId} item={item} onClick={handleItemClick} />) : <div className="p-20 text-center text-gray-400 text-sm">No items found.</div>}
          </DashboardCard>
        </div>

        <div className="space-y-6 sticky top-6 h-fit text-left">
          <DashboardCard color="#10B981" title="Live Projects" icon={Rocket} contentClassName="space-y-3 pt-4 max-h-[250px] overflow-y-auto custom-scrollbar">
            {liveProjects.length > 0 ? liveProjects.map(p => (
              <div key={p.id} className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="flex flex-col min-w-0 pr-2"><span className="text-sm font-bold text-gray-900 truncate">{p.name}</span><span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><User className="h-3 w-3 text-emerald-500" /> {p.pic}</span></div>
                <Badge className="bg-white text-emerald-600 border-emerald-200 text-[10px] font-bold">LIVE</Badge>
              </div>
            )) : <div className="text-center p-4 text-gray-400 text-xs">No live projects found.</div>}
          </DashboardCard>

          <DashboardCard color="#E11D48" title="Report Issue" icon={PlusCircle} contentClassName="space-y-4 pt-5 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold text-gray-500 uppercase">Project</Label><DashboardSelect value={issueForm.projectId} onChange={(e: any) => setIssueForm(p => ({...p, projectId: e.target.value}))}><option value="">Select...</option>{liveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</DashboardSelect></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold text-gray-500 uppercase">Priority</Label><DashboardSelect value={issueForm.priority} onChange={(e: any) => setIssueForm(p => ({...p, priority: e.target.value}))}>{['critical', 'high', 'medium', 'low'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}</DashboardSelect></div>
            </div>
            <DashboardInput value={issueForm.title} onChange={(e: any) => setIssueForm(p => ({...p, title: e.target.value}))} placeholder="Summary..." />
            <DashboardTextarea value={issueForm.description} onChange={(e: any) => setIssueForm(p => ({...p, description: e.target.value}))} placeholder="Details..." />
            <Button onClick={handleIssueSubmit} disabled={isBusy || !issueForm.projectId} className="w-full font-bold bg-[#E11D48] hover:bg-[#be123c] text-white rounded-xl">{isBusy ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit"}</Button>
          </DashboardCard>

          <DashboardCard color="#36A39D" title="Idea" icon={Lightbulb} contentClassName="space-y-4 pt-5 pb-6">
            <DashboardSelect value={impForm.projectId} onChange={(e: any) => setImpForm(p => ({...p, projectId: e.target.value}))}><option value="">Select Project...</option>{liveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</DashboardSelect>
            <DashboardTextarea value={impForm.description} onChange={(e: any) => setImpForm(p => ({...p, description: e.target.value}))} placeholder="Your idea..." />
            <Button onClick={handleImprovementSubmit} disabled={isBusy || !impForm.projectId} className="w-full font-bold bg-[#36A39D] text-white rounded-xl">{isBusy ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit"}</Button>
          </DashboardCard>
        </div>
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[500px] p-0 overflow-hidden">
          {selectedItem && (
            <>
              <div className={`p-6 border-b border-gray-100 flex justify-between items-start ${selectedItem.type === 'improvement' ? 'bg-[#36A39D]/5' : 'bg-white'}`}>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`text-[10px] font-bold ${selectedItem.type === 'improvement' ? 'text-[#36A39D] border-[#36A39D]' : 'text-slate-500'}`}>{selectedItem.type.toUpperCase()}</Badge>
                    <span className="text-xs text-gray-400 font-mono">{'issueId' in selectedItem ? selectedItem.issueId : selectedItem.noteId}</span>
                  </div>
                  <DialogTitle className="text-lg font-bold uppercase">{('title' in selectedItem ? selectedItem.title : "Improvement Plan")}</DialogTitle>
                  <DialogDescription className="text-xs text-gray-500">Project: {selectedItem.projectName}</DialogDescription>
                </div>
                {selectedItem.type === 'improvement' ? <Lightbulb className="h-5 w-5 text-[#36A39D]" /> : <StatusBadge value={'status' in selectedItem ? selectedItem.status : ''} />}
              </div>
              <div className="p-6 space-y-6 text-left">
                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <div className="space-y-1"><span className="text-[10px] font-bold text-gray-400 uppercase">Reporter</span><p className="font-semibold text-gray-800 flex items-center gap-1.5"><User className="h-4 w-4 text-gray-400"/> {selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).reviewer : (selectedItem as ProjectIssue).reportedBy}</p></div>
                  <div className="space-y-1"><span className="text-[10px] font-bold text-gray-400 uppercase">Submitted</span><p className="font-medium text-gray-700 flex items-center gap-1.5"><Calendar className="h-4 w-4 text-gray-400"/> {formatDate(selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).createdDate : (selectedItem as ProjectIssue).reportedDate)}</p></div>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-bold text-gray-500 uppercase">Description</Label><div className="bg-white p-4 rounded-xl text-sm border border-gray-200 shadow-inner">{selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).recommendations : (selectedItem as ProjectIssue).description}</div></div>
                {selectedItem.type === 'issue' && (
                  (selectedItem as ProjectIssue).status === 'resolved' ? <div className="p-4 bg-emerald-50 rounded-xl text-emerald-700 font-bold flex items-center gap-3"><CheckCircle2 className="h-5 w-5" /> Issue Resolved.</div> : (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-gray-500 uppercase">Status</Label><DashboardSelect value={(selectedItem as ProjectIssue).status} onChange={(e: any) => onUpdateStatus(selectedItem.id, e.target.value)} disabled={isBusy}>{['open', 'in-progress', 'resolved'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}</DashboardSelect></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-gray-500 uppercase">Action</Label>{!deleteConfirm ? <Button variant="outline" onClick={() => setDeleteConfirm(true)} className="w-full h-10 text-xs text-red-600 border-red-200">Delete</Button> : <div className="flex gap-1"><Button variant="ghost" onClick={() => setDeleteConfirm(false)} className="flex-1 text-[10px]">No</Button><Button variant="destructive" onClick={() => onDeleteIssue(selectedItem.id)} className="flex-1 text-[10px]">{isBusy ? <Loader2 className="animate-spin h-3 w-3"/> : 'Yes, Delete'}</Button></div>}</div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}