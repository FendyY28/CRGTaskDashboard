import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { 
  AlertTriangle, TrendingUp, FileText, PlusCircle, Lightbulb, 
  Filter, Loader2, Trash2, ChevronRight, Clock 
} from "lucide-react";
import { API_URL, capitalize } from "../../../lib/utils";
import { 
  PageHeader, DashboardKpiCard, StatusBadge, DashboardInput, 
  DashboardTextarea, DashboardSelect, FeedbackMsg, DashboardCard 
} from "../dashboard/SharedComponents";

// --- SUB-COMPONENT: Memoized Log Row ---
const LogRow = memo(({ item, onClick }: { item: any, onClick: () => void }) => {
  const isImp = item.type === 'improvement';
  
  // Custom styling based on priority and type
  const getSidebarColor = () => {
    if (isImp) return 'border-l-[#36A39D]';
    if (item.priority === 'critical') return 'border-l-[#7C2D12]';
    if (item.priority === 'high') return 'border-l-[#E11D48]';
    return 'border-l-gray-300';
  };

  return (
    <div 
      onClick={onClick} 
      className={`p-4 rounded-xl border bg-white border-gray-100 shadow-sm cursor-pointer transition-all duration-200 group hover:shadow-md border-l-4 ${getSidebarColor()}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 overflow-hidden w-full">
          <div className={`mt-1 h-9 w-9 min-w-[36px] rounded-full flex items-center justify-center border-2 ${isImp ? 'border-[#36A39D]/20 bg-[#36A39D]/5 text-[#36A39D]' : 'border-gray-100 bg-gray-50 text-gray-400 group-hover:border-[#36A39D]/30 group-hover:text-[#36A39D]'}`}>
            {isImp ? <Lightbulb className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          
          <div className="overflow-hidden w-full text-left">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900 truncate uppercase">
                    {item.title || "Improvement Proposal"}
                  </h4>
                  {item.type === 'issue' && <StatusBadge value={item.priority} />}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-bold text-gray-400">{item.issueId || item.noteId}</span>
                  <span>•</span>
                  <span className="font-medium text-gray-600">{item.project?.name || item.projectName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-2">
                {item.type === 'issue' && <StatusBadge value={item.status} />}
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#36A39D] transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
            <p className="text-xs text-gray-500 line-clamp-1 mt-2 pr-8 italic">
              {item.description || item.recommendations}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export function PostImplementation() {
  const [selectedItem, setSelectedItem] = useState<any | null>(null); 
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState<{ issues: any[], improvements: any[], projects: any[] }>({ 
    issues: [], improvements: [], projects: [] 
  });
  
  const [forms, setForms] = useState({ 
    issue: { projectId: "", title: "", category: "medium", description: "" }, 
    improvement: { projectId: "", description: "" } 
  });
  
  const [ui, setUi] = useState({ busy: false, formStatus: null as any, modalStatus: null as any, deleteConfirm: false });

  // --- LOGIC: Fetch Data with Cleanup ---
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [prjRes, issRes] = await Promise.all([
        fetch(`${API_URL}/project`, { signal }),
        fetch(`${API_URL}/project/issue`, { signal })
      ]);
      
      const prj = await prjRes.json();
      const iss = await issRes.json();

      const live = Array.isArray(prj) ? prj.filter((p: any) => p.currentPhase?.toLowerCase().trim() === 'live') : [];
      const imps = live.flatMap((p: any) => (p.improvements || []).map((imp: any) => ({ 
        ...imp, projectName: p.name, type: 'improvement' 
      })));
      const issues = Array.isArray(iss) ? iss.map((i: any) => ({ ...i, type: 'issue' })) : [];
      
      setData({ issues, improvements: imps, projects: live });
    } catch (e: any) { 
      if (e.name !== 'AbortError') console.error("Load failed", e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Reset modal UI when item is closed
  useEffect(() => { 
    if (!selectedItem) setUi(p => ({ ...p, modalStatus: null, deleteConfirm: false })); 
  }, [selectedItem]);

  // --- LOGIC: API Requests ---
  const handleRequest = async (url: string, method: string, body: any, successMsg: string, isModal = false) => {
    setUi(p => ({ ...p, busy: true, [isModal ? 'modalStatus' : 'formStatus']: null }));
    try {
        const res = await fetch(url, { 
          method, 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(body) 
        });
        if (!res.ok) throw new Error();
        
        await fetchData();
        
        setUi(p => ({ ...p, [isModal ? 'modalStatus' : 'formStatus']: { type: 'success', text: successMsg } }));
        
        if (!isModal) {
            setForms(p => ({ 
              issue: { ...p.issue, title: "", description: "" }, 
              improvement: { ...p.improvement, description: "" } 
            }));
            setTimeout(() => setUi(p => ({ ...p, formStatus: null })), 3000);
        } else {
            if (method === 'DELETE') setSelectedItem(null);
            else if (body.status) setSelectedItem((prev: any) => ({ ...prev, status: body.status }));
        }
    } catch { 
      setUi(p => ({ ...p, [isModal ? 'modalStatus' : 'formStatus']: { type: 'error', text: "Operation failed." } })); 
    } finally { 
      setUi(p => ({ ...p, busy: false })); 
    }
  };

  // --- COMPUTED: Filtered List & Stats ---
  const filteredList = useMemo(() => {
    const combined = [...data.issues, ...data.improvements];
    return combined
      .filter(i => {
        if (filter === 'all') return true;
        if (filter === 'improvements') return i.type === 'improvement';
        return i.priority === filter;
      })
      .sort((a, b) => new Date(b.reportedDate || b.createdDate).getTime() - new Date(a.reportedDate || a.createdDate).getTime());
  }, [data, filter]);

  const stats = useMemo(() => ({
    critical: data.issues.filter(i => i.priority === "critical").length,
    high: data.issues.filter(i => i.priority === "high").length,
    open: data.issues.filter(i => i.status === "open").length,
    improvements: data.improvements.length
  }), [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#36A39D] font-bold animate-pulse"><Loader2 className="animate-spin h-6 w-6 mr-2"/> Initializing PIR Module...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <PageHeader title="Post Implementation Review" description="Monitoring, Issue Tracking, and Feedback for Live Projects." />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {[ 
          { l: "Critical Issues", c: stats.critical, i: AlertTriangle, clr: "#7C2D12", f: 'critical' }, 
          { l: "High Priority", c: stats.high, i: AlertTriangle, clr: "#E11D48", f: 'high' }, 
          { l: "Open Issues", c: stats.open, i: Clock, clr: "#F59E0B", f: 'all' }, 
          { l: "Improvements", c: stats.improvements, i: TrendingUp, clr: "#36A39D", f: 'improvements' } 
        ].map((k, i) => (
          <DashboardKpiCard 
            key={i} 
            label={k.l} 
            count={k.c} 
            icon={k.i} 
            color={k.clr} 
            onClick={() => setFilter(k.f)} 
            active={filter === k.f} 
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Log Section */}
        <DashboardCard 
          className="xl:col-span-2 h-fit" 
          color="linear-gradient(to right, #E11D48, #F9AD3C)" 
          title="Review & Issue Log" 
          icon={Filter} 
          headerAction={
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setFilter(s)} 
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg capitalize transition-all border ${filter === s ? 'bg-white border-[#36A39D] text-[#36A39D] shadow-sm' : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          } 
          contentClassName="min-h-[400px] space-y-3 pt-4"
        >
          {filteredList.length > 0 ? filteredList.map((item, idx) => (
            <LogRow 
              key={item.id || idx} 
              item={item} 
              onClick={() => setSelectedItem(item)} 
            />
          )) : (
            <div className="p-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm flex flex-col items-center">
              <FileText className="h-10 w-10 mb-2 opacity-30"/>
              No records match the current filter.
            </div>
          )}
        </DashboardCard>

        {/* Sidebar Forms */}
        <div className="space-y-6 sticky top-6 h-fit text-left">
          <DashboardCard color="#E11D48" title="Report Live Issue" icon={PlusCircle} contentClassName="space-y-4 pt-5 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-gray-500 uppercase">Project</Label>
                <DashboardSelect value={forms.issue.projectId} onChange={(e: any) => setForms(p => ({...p, issue: {...p.issue, projectId: e.target.value}}))}>
                  <option value="">Select...</option>
                  {data.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </DashboardSelect>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-gray-500 uppercase">Priority</Label>
                <DashboardSelect value={forms.issue.category} onChange={(e: any) => setForms(p => ({...p, issue: {...p.issue, category: e.target.value}}))}>
                  {['critical', 'high', 'medium', 'low'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
                </DashboardSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Issue Title</Label>
              <DashboardInput value={forms.issue.title} onChange={(e: any) => setForms(p => ({...p, issue: {...p.issue, title: e.target.value}}))} placeholder="Brief summary..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Details</Label>
              <DashboardTextarea value={forms.issue.description} onChange={(e: any) => setForms(p => ({...p, issue: {...p.issue, description: e.target.value}}))} placeholder="What happened?" />
            </div>
            <Button 
              onClick={() => handleRequest(`${API_URL}/project/issue`, 'POST', { issueId: `ISS-${Date.now().toString().slice(-4)}`, ...forms.issue, reportedBy: "Admin" }, "Issue Reported!")} 
              disabled={ui.busy || !forms.issue.projectId || !forms.issue.title} 
              className="w-full font-bold text-white shadow-md h-10 rounded-xl bg-[#E11D48] hover:bg-[#be123c]"
            >
              {ui.busy ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Live Issue"}
            </Button>
          </DashboardCard>

          <DashboardCard color="#36A39D" title="Optimization Idea" icon={Lightbulb} contentClassName="space-y-4 pt-5 pb-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Target Project</Label>
              <DashboardSelect value={forms.improvement.projectId} onChange={(e: any) => setForms(p => ({...p, improvement: {...p.improvement, projectId: e.target.value}}))}>
                <option value="">Select Project...</option>
                {data.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </DashboardSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Improvement Plan</Label>
              <DashboardTextarea value={forms.improvement.description} onChange={(e: any) => setForms(p => ({...p, improvement: {...p.improvement, description: e.target.value}}))} placeholder="How can we make it better?" />
            </div>
            {ui.formStatus && <FeedbackMsg status={ui.formStatus} />}
            <Button 
              onClick={() => handleRequest(`${API_URL}/project/improvement`, 'POST', { noteId: `IMP-${Date.now().toString().slice(-4)}`, ...forms.improvement, recommendations: forms.improvement.description, feedback: forms.improvement.description, priority: "medium", reviewer: "Stakeholder", developer: "Team" }, "Idea Submitted!")} 
              disabled={ui.busy || !forms.improvement.projectId || !forms.improvement.description} 
              className="w-full font-bold text-[#36A39D] border border-[#36A39D]/30 bg-[#36A39D]/5 hover:bg-[#36A39D] hover:text-white h-10 rounded-xl shadow-none"
            >
              {ui.busy ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Proposal"}
            </Button>
          </DashboardCard>
        </div>
      </div>

      {/* Item Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          {selectedItem && (
            <>
              <div className={`p-6 pr-12 border-b border-gray-100 flex justify-between items-start ${selectedItem.type === 'improvement' ? 'bg-[#36A39D]/5' : 'bg-white'}`}>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`border text-[10px] font-bold ${selectedItem.type === 'improvement' ? 'text-[#36A39D] border-[#36A39D] bg-white' : 'text-slate-500 border-slate-300 bg-white'}`}>
                      {selectedItem.type === 'improvement' ? 'IMPROVEMENT' : 'ISSUE'}
                    </Badge>
                    <span className="text-xs text-gray-400 font-mono font-medium">{selectedItem.issueId || selectedItem.noteId}</span>
                  </div>
                  <DialogTitle className="text-lg font-bold text-gray-900 leading-snug uppercase">
                    {selectedItem.title || "Improvement Proposal"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 font-medium mt-1">
                    Project: {selectedItem.project?.name || selectedItem.projectName}
                  </DialogDescription>
                </div>
                {selectedItem.type === 'improvement' ? <div className="bg-white p-2 rounded-xl shadow-sm"><Lightbulb className="h-5 w-5 text-[#36A39D]" /></div> : <StatusBadge value={selectedItem.status} />}
              </div>

              <div className="p-6 space-y-6 text-left">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Detailed Description</Label>
                  <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100">
                    {selectedItem.description || selectedItem.recommendations}
                  </div>
                </div>
                
                {ui.modalStatus && <FeedbackMsg status={ui.modalStatus} />}
                
                {selectedItem.type === 'issue' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase">Update Status</Label>
                          <DashboardSelect 
                            value={selectedItem.status} 
                            onChange={(e: any) => handleRequest(`${API_URL}/project/issue/${selectedItem.id}`, 'PATCH', { status: e.target.value }, "Status Updated!", true)} 
                            disabled={ui.busy}
                          >
                            {['open', 'in-progress', 'resolved'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                          </DashboardSelect>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase">Danger Zone</Label>
                          {!ui.deleteConfirm ? (
                            <Button variant="outline" onClick={() => setUi(p => ({ ...p, deleteConfirm: true }))} className="w-full h-10 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl transition-colors">
                              <Trash2 className="h-3.5 w-3.5 mr-2"/> Delete Issue
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button variant="ghost" onClick={() => setUi(p => ({ ...p, deleteConfirm: false }))} className="flex-1 h-10 text-[10px] font-bold text-gray-500 rounded-xl">Cancel</Button>
                              <Button variant="destructive" onClick={() => handleRequest(`${API_URL}/project/issue/${selectedItem.id}`, 'DELETE', {}, "Deleted", true)} className="flex-1 h-10 text-[10px] font-bold bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
                                {ui.busy ? <Loader2 className="animate-spin h-3 w-3"/> : "Confirm"}
                              </Button>
                            </div>
                          )}
                        </div>
                    </div>
                ) : (
                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Button onClick={() => setSelectedItem(null)} className="h-9 text-xs font-bold bg-[#36A39D] text-white hover:bg-[#2b8580] rounded-xl px-6 transition-colors shadow-sm">
                      Close Detail
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}