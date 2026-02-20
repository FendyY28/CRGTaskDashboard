import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { 
  AlertTriangle, TrendingUp, FileText, PlusCircle, Lightbulb, 
  Filter, Loader2, Trash2, ChevronRight, Clock, Rocket, User, Calendar, CheckCircle2
} from "lucide-react";
import { API_URL, capitalize } from "../../../lib/utils";
import { 
  PageHeader, DashboardKpiCard, StatusBadge, DashboardInput, 
  DashboardTextarea, DashboardSelect, FeedbackMsg, DashboardCard 
} from "../dashboard/SharedComponents";

// 🚀 OPTIMISASI 1: Caching formatter agar tidak instance ulang setiap kali dipanggil
const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

const formatDate = (dateString: string) => {
  if (!dateString) return "Unknown Date";
  return DATE_FORMATTER.format(new Date(dateString));
};

const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const backupEmail = localStorage.getItem('user_email');
    const backupName = localStorage.getItem('user_name');

    if (!token || token === "mock-jwt-token") return backupEmail || backupName || null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return backupEmail || backupName || null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    
    const parsed = JSON.parse(jsonPayload);
    return parsed.id || parsed.sub || parsed.userId || parsed.email || backupEmail; 
  } catch (e) {
    return localStorage.getItem('user_email') || null;
  }
};

// 🚀 OPTIMISASI 2: Memperbaiki memoization agar komponen tidak re-render kecuali props item berubah.
// onClick diubah agar menerima parameter item, menghindari inline function di parent.
const LogRow = memo(({ item, onClick }: { item: any, onClick: (item: any) => void }) => {
  const isImp = item.type === 'improvement';
  
  const getSidebarColor = () => {
    if (isImp) return 'border-l-[#36A39D]';
    if (item.priority === 'critical') return 'border-l-[#7C2D12]';
    if (item.priority === 'high') return 'border-l-[#E11D48]';
    return 'border-l-gray-300';
  };

  const reporterName = isImp ? item.reviewer : item.reportedBy;
  const dateReported = isImp ? item.createdDate : item.reportedDate;

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
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#E11D48] transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
            
            <p className="text-xs text-gray-500 line-clamp-1 mt-2 pr-8 italic">
              {item.description || item.recommendations}
            </p>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50/50">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                <User className="h-3 w-3 text-gray-400" /> 
                {reporterName || "System Admin"}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                <Calendar className="h-3 w-3 text-gray-400" /> 
                {formatDate(dateReported)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
// Penting: tambahkan displayName agar React DevTools mudah di debug
LogRow.displayName = "LogRow";

const INITIAL_FORMS = {
  issue: { projectId: "", title: "", priority: "medium", description: "" },
  improvement: { projectId: "", description: "" }
};

export function PostImplementation() {
  const [selectedItem, setSelectedItem] = useState<any | null>(null); 
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'active' | 'resolved' | 'improvements'>('active'); 
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState<{ issues: any[], improvements: any[], projects: any[] }>({ 
    issues: [], improvements: [], projects: [] 
  });
  
  // 🚀 OPTIMISASI 3: Memisahkan state form & UI agar pengetikan (onChange) tidak trigger re-render besar
  const [issueForm, setIssueForm] = useState(INITIAL_FORMS.issue);
  const [impForm, setImpForm] = useState(INITIAL_FORMS.improvement);
  
  const [isBusy, setIsBusy] = useState(false);
  const [formStatus, setFormStatus] = useState<any>(null);
  const [modalStatus, setModalStatus] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // 🚀 OPTIMISASI 4: Callback yang stabil untuk Row click, mempertahankan efisiensi memo pada LogRow
  const handleItemClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const [prjRes, issRes] = await Promise.all([
        fetch(`${API_URL}/project`, { signal, headers }),
        fetch(`${API_URL}/project/issue`, { signal, headers })
      ]);
      
      if (!prjRes.ok || !issRes.ok) throw new Error("Gagal mengambil data dari server");

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

  useEffect(() => { 
    if (!selectedItem) {
      setModalStatus(null);
      setDeleteConfirm(false);
    }
  }, [selectedItem]);

  const handleRequest = async (url: string, method: string, body: any, successMsg: string, isModal = false) => {
    setIsBusy(true);
    if (isModal) setModalStatus(null); else setFormStatus(null);
    
    try {
        const token = localStorage.getItem("auth_token");
        const realUserId = getUserIdFromToken();
        const userName = localStorage.getItem('user_name') || "System Admin";

        const payload = {
            ...body,
            userId: realUserId,
            ...(method === 'POST' && { reportedBy: userName, reviewer: userName })
        };

        const res = await fetch(url, { 
          method, 
          headers: { 
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }) 
          }, 
          body: JSON.stringify(payload) 
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Request ditolak oleh server.");
        }
        
        await fetchData();
        
        if (isModal) {
            setModalStatus({ type: 'success', text: successMsg });
            if (method === 'DELETE') setSelectedItem(null);
            else if (body.status) setSelectedItem((prev: any) => ({ ...prev, status: body.status }));
        } else {
            setFormStatus({ type: 'success', text: successMsg });
            setIssueForm(INITIAL_FORMS.issue);
            setImpForm(INITIAL_FORMS.improvement);
            setTimeout(() => setFormStatus(null), 3000);
        }
    } catch (error: any) { 
      if (isModal) setModalStatus({ type: 'error', text: error.message || "Operation failed." });
      else setFormStatus({ type: 'error', text: error.message || "Operation failed." });
    } finally { 
      setIsBusy(false); 
    }
  };

  const filteredList = useMemo(() => {
    return [...data.issues, ...data.improvements]
      .filter(i => {
        const isResolved = i.status === 'resolved';
        
        if (activeTab === 'improvements' && i.type !== 'improvement') return false;
        if (activeTab === 'resolved' && (i.type === 'improvement' || !isResolved)) return false; 
        if (activeTab === 'active' && (i.type === 'improvement' || isResolved)) return false;

        if (filter === 'all') return true;
        if (filter === 'improvements') return i.type === 'improvement'; 
        return i.priority === filter;
      })
      .sort((a, b) => new Date(b.reportedDate || b.createdDate).getTime() - new Date(a.reportedDate || a.createdDate).getTime());
  }, [data, filter, activeTab]);

  const stats = useMemo(() => ({
    critical: data.issues.filter(i => i.priority === "critical" && i.status !== "resolved").length,
    high: data.issues.filter(i => i.priority === "high" && i.status !== "resolved").length,
    open: data.issues.filter(i => i.status === "open").length,
    improvements: data.improvements.length
  }), [data]);

  // 🚀 OPTIMISASI 5: Memoization konfigurasi warna card agar kalkulasi visual lebih ringan
  const cardConfig = useMemo(() => {
    switch (activeTab) {
      case 'resolved':
        return { color: "#10B981", icon: CheckCircle2, title: "Resolved Archive", subtitle: "View archived completed issues.", textColor: "text-emerald-600", borderColor: "border-emerald-500" };
      case 'improvements':
        return { color: "#36A39D", icon: Lightbulb, title: "Optimization Ideas", subtitle: "Review submitted system improvements.", textColor: "text-[#36A39D]", borderColor: "border-[#36A39D]" };
      default: 
        return { color: "#E11D48", icon: Filter, title: "Active Issue Log", subtitle: "Monitor and manage ongoing issues.", textColor: "text-[#E11D48]", borderColor: "border-[#E11D48]" };
    }
  }, [activeTab]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#E11D48] font-bold animate-pulse"><Loader2 className="animate-spin h-6 w-6 mr-2"/> Initializing PIR Module...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <PageHeader title="Post Implementation Review" description="Monitoring, Issue Tracking, and Feedback for Live Projects." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {[ 
          { l: "Critical Issues", c: stats.critical, i: AlertTriangle, clr: "#7C2D12", f: 'critical', tab: 'active' as const }, 
          { l: "High Priority", c: stats.high, i: AlertTriangle, clr: "#E11D48", f: 'high', tab: 'active' as const }, 
          { l: "Open Issues", c: stats.open, i: Clock, clr: "#F59E0B", f: 'all', tab: 'active' as const }, 
          { l: "Improvements", c: stats.improvements, i: TrendingUp, clr: "#36A39D", f: 'all', tab: 'improvements' as const } 
        ].map((k, i) => (
          <DashboardKpiCard 
            key={i} 
            label={k.l} count={k.c} icon={k.i} color={k.clr} 
            onClick={() => { setFilter(k.f); setActiveTab(k.tab); }} 
            active={filter === k.f && activeTab === k.tab} 
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          
          <div className="flex border-b border-gray-200">
            {['active', 'resolved', 'improvements'].map((tab) => (
              <button 
                key={tab}
                onClick={() => { setActiveTab(tab as any); setFilter('all'); }} 
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${
                  activeTab === tab 
                  ? (tab === 'active' ? 'border-[#E11D48] text-[#E11D48]' : tab === 'resolved' ? 'border-emerald-500 text-emerald-600' : 'border-[#36A39D] text-[#36A39D]') 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                {tab === 'active' ? 'Active Log' : tab === 'resolved' ? 'Resolved Archive' : 'Improvements'}
              </button>
            ))}
          </div>

          <DashboardCard 
            className="h-fit shadow-sm ring-1 ring-gray-200 transition-colors duration-300" 
            color={cardConfig.color} icon={cardConfig.icon} 
            title={
              <div className="flex flex-col text-left">
                  <span className={`text-lg font-bold uppercase tracking-wide ${cardConfig.textColor}`}>{cardConfig.title}</span>
                  <p className="text-[10px] text-gray-400 font-medium normal-case tracking-normal">{cardConfig.subtitle}</p>
              </div>
            }
            headerAction={
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {activeTab !== 'improvements' && ['all', 'critical', 'high', 'medium', 'low'].map(s => (
                  <button 
                    key={s} onClick={() => setFilter(s)} 
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg capitalize transition-all border ${filter === s ? `bg-white shadow-sm ${cardConfig.textColor} ${cardConfig.borderColor}` : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            } 
            contentClassName="min-h-[400px] space-y-3 pt-4"
          >
            {filteredList.length > 0 ? filteredList.map(item => (
              /* Menggunakan handleItemClick mempertahankan efisiensi React.memo pada LogRow */
              <LogRow key={item.id} item={item} onClick={handleItemClick} />
            )) : (
              <div className="p-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm flex flex-col items-center">
                {activeTab === 'resolved' && <><CheckCircle2 className="h-10 w-10 mb-2 opacity-30 text-emerald-500"/> No resolved issues found.</>}
                {activeTab === 'improvements' && <><Lightbulb className="h-10 w-10 mb-2 opacity-30 text-[#36A39D]"/> No optimization ideas submitted yet.</>}
                {activeTab === 'active' && <><FileText className="h-10 w-10 mb-2 opacity-30 text-[#E11D48]"/> No active issues found.</>}
              </div>
            )}
          </DashboardCard>
        </div>

        {/* --- SIDEBAR --- */}
        <div className="space-y-6 sticky top-6 h-fit text-left">
          <DashboardCard color="#10B981" title="Active Live Projects" icon={Rocket} contentClassName="space-y-3 pt-4 pb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {data.projects.length > 0 ? (
              <div className="space-y-2">
                {data.projects.map(p => (
                  <div key={p.id} className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center justify-between group hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">{p.name}</span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1 mt-0.5"><User className="h-3 w-3 text-emerald-500" /> {p.pic || "Unassigned"}</span>
                    </div>
                    <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-200 text-[10px] font-bold shadow-sm shrink-0">LIVE</Badge>
                  </div>
                ))}
              </div>
            ) : <div className="text-center p-4 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs bg-gray-50/50">No projects are currently in Live phase.</div>}
          </DashboardCard>

          <DashboardCard color="#E11D48" title="Report Live Issue" icon={PlusCircle} contentClassName="space-y-4 pt-5 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-gray-500 uppercase">Project</Label>
                <DashboardSelect value={issueForm.projectId} onChange={(e: any) => setIssueForm(p => ({...p, projectId: e.target.value}))}>
                  <option value="">Select...</option>
                  {data.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </DashboardSelect>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-gray-500 uppercase">Priority</Label>
                <DashboardSelect value={issueForm.priority} onChange={(e: any) => setIssueForm(p => ({...p, priority: e.target.value}))}>
                  {['critical', 'high', 'medium', 'low'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
                </DashboardSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Issue Title</Label>
              <DashboardInput value={issueForm.title} onChange={(e: any) => setIssueForm(p => ({...p, title: e.target.value}))} placeholder="Brief summary..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Details</Label>
              <DashboardTextarea value={issueForm.description} onChange={(e: any) => setIssueForm(p => ({...p, description: e.target.value}))} placeholder="What happened?" />
            </div>
            {formStatus && !formStatus.text.includes("Idea") && <FeedbackMsg status={formStatus} />}
            <Button 
              onClick={() => handleRequest(`${API_URL}/project/issue`, 'POST', { issueId: `ISS-${Date.now().toString().slice(-4)}`, impactArea: "General", ...issueForm }, "Issue Reported!")} 
              disabled={isBusy || !issueForm.projectId || !issueForm.title} 
              className="w-full font-bold text-white shadow-md h-10 rounded-xl bg-[#E11D48] hover:bg-[#be123c]"
            >
              {isBusy ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Live Issue"}
            </Button>
          </DashboardCard>

          <DashboardCard color="#36A39D" title="Optimization Idea" icon={Lightbulb} contentClassName="space-y-4 pt-5 pb-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Target Project</Label>
              <DashboardSelect value={impForm.projectId} onChange={(e: any) => setImpForm(p => ({...p, projectId: e.target.value}))}>
                <option value="">Select Project...</option>
                {data.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </DashboardSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-500 uppercase">Improvement Plan</Label>
              <DashboardTextarea value={impForm.description} onChange={(e: any) => setImpForm(p => ({...p, description: e.target.value}))} placeholder="How can we make it better?" />
            </div>
            {formStatus && formStatus.text.includes("Idea") && <FeedbackMsg status={formStatus} />}
            <Button 
              onClick={() => handleRequest(`${API_URL}/project/improvement`, 'POST', { noteId: `IMP-${Date.now().toString().slice(-4)}`, ...impForm, recommendations: impForm.description, feedback: impForm.description, priority: "medium", developer: "Team" }, "Idea Submitted!")} 
              disabled={isBusy || !impForm.projectId || !impForm.description} 
              className="w-full font-bold text-[#36A39D] border border-[#36A39D]/30 bg-[#36A39D]/5 hover:bg-[#36A39D] hover:text-white h-10 rounded-xl shadow-none"
            >
              {isBusy ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Proposal"}
            </Button>
          </DashboardCard>
        </div>
      </div>

      {/* --- MODAL --- */}
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
                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Reported By</span>
                    <p className="font-semibold text-gray-800 flex items-center gap-1.5"><User className={`h-4 w-4 ${selectedItem.type === 'improvement' ? 'text-[#36A39D]' : 'text-[#E11D48]'}`}/> {selectedItem.type === 'improvement' ? selectedItem.reviewer : selectedItem.reportedBy || "System Admin"}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Date Submitted</span>
                    <p className="font-medium text-gray-700 flex items-center gap-1.5"><Calendar className="h-4 w-4 text-gray-400"/> {formatDate(selectedItem.type === 'improvement' ? selectedItem.createdDate : selectedItem.reportedDate)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">Detailed Description</Label>
                  <div className="bg-white p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-200 shadow-sm">
                    {selectedItem.description || selectedItem.recommendations}
                  </div>
                </div>
                
                {modalStatus && <FeedbackMsg status={modalStatus} />}
                
                {selectedItem.type === 'issue' ? (
                  selectedItem.status === 'resolved' ? (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-800">Issue Resolved</h4>
                        <p className="text-xs text-emerald-600 mt-1">
                          This issue has been marked as resolved and no further action is required.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 mt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase">Update Status</Label>
                          <DashboardSelect 
                            value={selectedItem.status} 
                            onChange={(e: any) => handleRequest(`${API_URL}/project/issue/${selectedItem.id}`, 'PATCH', { status: e.target.value }, "Status Updated!", true)} 
                            disabled={isBusy}
                          >
                            {['open', 'in-progress', 'resolved'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                          </DashboardSelect>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase">Danger Zone</Label>
                          {!deleteConfirm ? (
                            <Button variant="outline" onClick={() => setDeleteConfirm(true)} className="w-full h-10 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl transition-colors">
                              <Trash2 className="h-3.5 w-3.5 mr-2"/> Delete Issue
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button variant="ghost" onClick={() => setDeleteConfirm(false)} className="flex-1 h-10 text-[10px] font-bold text-gray-500 rounded-xl">Cancel</Button>
                              <Button variant="destructive" onClick={() => handleRequest(`${API_URL}/project/issue/${selectedItem.id}`, 'DELETE', {}, "Deleted", true)} className="flex-1 h-10 text-[10px] font-bold bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
                                {isBusy ? <Loader2 className="animate-spin h-3 w-3"/> : "Confirm"}
                              </Button>
                            </div>
                          )}
                        </div>
                    </div>
                  )
                ) : (
                  <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
                    <Button onClick={() => setSelectedItem(null)} className="h-10 text-xs font-bold bg-[#36A39D] text-white hover:bg-[#2b8580] rounded-xl px-8 transition-all shadow-md hover:shadow-lg">
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