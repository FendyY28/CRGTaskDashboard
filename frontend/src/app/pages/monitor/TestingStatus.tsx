import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  CheckCircle2, XCircle, User, ShieldCheck, PlayCircle, LayoutList, 
  ThumbsUp, ThumbsDown, Plus, StickyNote, Pencil, 
  AlertOctagon, RotateCcw, Clock, CalendarDays, ArchiveX
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { TEST_CASE_STATUS, TEST_CASE_TYPE, THEME } from "../../constants/projectConstants";
import { useTestCases } from "../../hooks/useTestCases";
import { toast } from "sonner";

// Map Constants ke Styles
const STYLES = {
  [TEST_CASE_STATUS.PASS]: { bg: `bg-[${THEME.TOSCA}]/5 border-[${THEME.TOSCA}]/20`, text: `text-[${THEME.TOSCA}]`, badge: `bg-[${THEME.TOSCA}]/10 text-[${THEME.TOSCA}] border-[${THEME.TOSCA}]/20`, icon: CheckCircle2 },
  [TEST_CASE_STATUS.FAIL]: { bg: "bg-[#E11D48]/5 border-[#E11D48]/20", text: "text-[#E11D48]", badge: "bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/20", icon: XCircle },
  [TEST_CASE_STATUS.PENDING]: { bg: "bg-white border-gray-100 hover:border-gray-200", text: "text-gray-400", badge: "text-gray-400 border-gray-200", icon: Clock }
};

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', { 
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return DATE_FORMATTER.format(new Date(dateStr));
};

// SUB-COMPONENT: TestCaseRow (Memoized)
const TestCaseRow = memo(({ item, onAction }: { item: any, onAction: (type: string, item: any) => void }) => {
  const isDel = item.isDeleted; // Gunakan flag ini sebagai tanda "Takeout"
  const s = isDel 
    ? { bg: "bg-gray-50 border-gray-200 opacity-90", text: "text-gray-400", badge: "bg-gray-100 text-gray-500", icon: ArchiveX }
    : (STYLES[item.status as keyof typeof STYLES] || STYLES[TEST_CASE_STATUS.PENDING]);
  
  const Icon = s.icon;
  let displayUser = item.updatedBy || "System";
  let displayTime = item.updatedAt || item.createdAt;
  let actionLabel = item.updatedBy ? "Updated" : "Created";
  let userIconColor = "text-gray-400";
  let badgeColor = "bg-gray-100/80";

  if (isDel) {
      displayUser = item.deletedBy || "Unknown";
      displayTime = item.deletedAt || item.updatedAt;
      actionLabel = "Taken Out";
      userIconColor = "text-red-400";
      badgeColor = "bg-red-50 text-red-600 border-red-100";
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 mb-3 group ${s.bg}`}>
      <div className="flex items-start gap-3 mb-3 sm:mb-0 w-full sm:w-auto overflow-hidden text-left">
        <div className={`mt-1 h-5 w-5 min-w-[20px] rounded-full flex items-center justify-center border-2 ${isDel ? 'border-gray-300 text-gray-400' : (item.status === TEST_CASE_STATUS.PENDING ? 'border-gray-300 text-gray-300' : `border-current ${s.text} bg-current text-white`)}`}>
          <Icon className="h-3 w-3" />
        </div>
        
        <div className="overflow-hidden w-full">
          <p className={`text-sm font-semibold truncate ${isDel ? 'text-gray-500 line-through decoration-gray-400' : (item.status === TEST_CASE_STATUS.PENDING ? 'text-gray-700' : 'text-gray-900')}`}>
            {item.title}
          </p>
          
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-gray-500 font-medium">
             <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${badgeColor}`}>
                <User className={`h-3 w-3 ${userIconColor}`} />
                <span className="truncate max-w-[100px]">{displayUser}</span>
             </div>
             <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${badgeColor}`}>
                {isDel ? <ArchiveX className="h-3 w-3 text-red-400"/> : <CalendarDays className="h-3 w-3 text-gray-400" />}
                <span>{actionLabel} {formatDate(displayTime)}</span>
             </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
             {isDel ? (
                // Tampilkan alasan Takeout
                <button onClick={() => onAction('view-takeout', item)} className="text-xs text-red-500 flex items-center gap-1.5 font-bold hover:underline"><StickyNote className="h-3 w-3" /> View Takeout Reason</button>
             ) : (
                <>
                  {item.status === TEST_CASE_STATUS.FAIL && item.defect ? (
                    <button onClick={() => onAction('view', item)} className="text-xs text-[#E11D48] flex items-center gap-1.5 font-bold hover:underline"><AlertOctagon className="h-3 w-3" /> View Defect</button>
                  ) : item.notes ? (
                    <button onClick={() => onAction('view', item)} className={`text-xs text-[${THEME.BSI_YELLOW}] flex items-center gap-1.5 font-medium hover:underline`}><StickyNote className="h-3 w-3" /> View Notes</button>
                  ) : null}
                  
                  {item.status === TEST_CASE_STATUS.PENDING && (
                    <button onClick={() => onAction('edit', item)} className={`text-xs text-gray-400 flex items-center gap-1.5 font-medium hover:text-[${THEME.TOSCA}]`}><Pencil className="h-3 w-3" /> {item.notes ? "Edit Notes" : "Add Notes"}</button>
                  )}
                </>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
        {!isDel ? (
          <>
            {item.status === TEST_CASE_STATUS.PENDING ? (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => onAction('pass', item)} className={`h-8 border-[${THEME.TOSCA}] text-[${THEME.TOSCA}] hover:bg-[${THEME.TOSCA}] hover:text-white rounded-lg`}><ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Pass</Button>
                <Button size="sm" variant="outline" onClick={() => onAction('fail', item)} className="h-8 border-[#E11D48] text-[#E11D48] hover:bg-[#E11D48] hover:text-white rounded-lg"><ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> Fail</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className={`${s.badge} shadow-none px-3 capitalize font-bold rounded-md`}>{item.status}</Badge>
                <Button variant="ghost" size="sm" onClick={() => onAction('reset', item)} className="h-7 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full px-2"><RotateCcw className="h-3 w-3 mr-1" /> Reset</Button>
              </div>
            )}
            <div className="h-4 w-[1px] bg-gray-200 mx-1"/>
            {/* Tombol Takeout */}
            <Button variant="ghost" size="icon" onClick={() => onAction('takeout', item)} title="Takeout this scenario" className="h-8 w-8 text-gray-400 hover:text-[#E11D48] hover:bg-red-50 rounded-full"><ArchiveX className="h-4 w-4" /></Button>
          </>
        ) : (
          <span className="text-[10px] font-bold uppercase text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 tracking-wider flex items-center gap-1">
            <ArchiveX className="h-3 w-3" /> TAKEOUT
          </span>
        )}
      </div>
    </div>
  );
});
TestCaseRow.displayName = "TestCaseRow";

// --- MAIN COMPONENT ---
export function TestingStatus() {
  const { 
    projects, testCases, loading, 
    fetchUatProjects, fetchTestCases, 
    addTestCase, updateTestCase, deleteTestCase 
  } = useTestCases();

  const [selProject, setSelProject] = useState<any | null>(null);
  const [modal, setModal] = useState<{ type: string | null, item?: any }>({ type: null });
  // Menambahkan form field 'takeoutReason'
  const [form, setForm] = useState({ title: "", type: TEST_CASE_TYPE.POSITIVE as string, notes: "", description: "", severity: "Low", takeoutReason: "" });
  const [showDeleted, setShowDeleted] = useState(false);

  // Load awal: Ambil project dan set project pertama sebagai default
  useEffect(() => {
    fetchUatProjects().then(data => {
      if (data && data.length > 0) {
        setSelProject(data[0]);
        fetchTestCases(data[0].id);
      }
    });
  }, [fetchUatProjects, fetchTestCases]);

  const handleRowAction = useCallback(async (type: string, item: any) => {
    if (type === 'reset') {
      toast.promise(
        updateTestCase(item.id, { status: TEST_CASE_STATUS.PENDING, notes: null }, selProject.id),
        { loading: 'Resetting test case...', success: 'Test case status reset to Pending.', error: 'Failed to reset test case.' }
      );
      return;
    }
    
    setModal({ type, item });
    
    // Reset form state based on action
    if (type === 'pass') setForm(f => ({ ...f, notes: "" }));
    else if (type === 'fail') setForm(f => ({ ...f, description: "", severity: "Low" }));
    else if (type === 'edit') setForm(f => ({ ...f, notes: item.notes || "" }));
    else if (type === 'takeout') setForm(f => ({ ...f, takeoutReason: "" }));
  }, [updateTestCase, selProject]);

  const handleAction = {
    add: async () => {
      toast.promise(
        addTestCase({ ...form, projectId: selProject.id }),
        { loading: 'Adding new scenario...', success: () => { setModal({ type: null }); return 'Test scenario added successfully!'; }, error: 'Failed to add scenario.' }
      );
    },
    update: async (status: string) => {
      const isFail = status === TEST_CASE_STATUS.FAIL;
      toast.promise(
        updateTestCase(modal.item.id, { 
          status, 
          notes: form.notes, 
          defect: isFail ? { description: form.description, severity: form.severity } : undefined 
        }, selProject.id),
        { loading: 'Updating execution record...', success: () => { setModal({ type: null }); return isFail ? 'Defect logged successfully.' : 'Test case marked as Passed!'; }, error: 'Failed to update test case.' }
      );
    },
    // Fungsi Takeout (sebelumnya delete)
    takeout: async () => {
      if (!form.takeoutReason.trim()) {
          toast.error("Please provide a reason for takeout.");
          return;
      }
      toast.promise(
        // Catatan: Karena backend (deleteTestCase) saat ini belum menerima body/reason, 
        // pastikan backend (deleteTestCase) diupdate untuk bisa menyimpan reason.
        // Jika tidak, kita gunakan updateTestCase untuk mengubah isDeleted dan menyisipkan reason di notes.
        // Asumsi: Kita override field notes dengan alasan takeout untuk sementara waktu (jika backend blm diupdate).
        updateTestCase(modal.item.id, { 
             status: modal.item.status, // Biarkan status sama, atau set fail
             notes: `[TAKEOUT REASON]: ${form.takeoutReason}`, // Override notes
             isDeleted: true // Trigger soft delete (jika didukung backend secara patch)
        }, selProject.id).then(() => deleteTestCase(modal.item.id, selProject.id)), 
        // ^ Idealnya `deleteTestCase` punya parameter data tambahan untuk mencatat Takeout Reason di backend.
        { loading: 'Processing takeout...', success: () => { setModal({ type: null }); return 'Scenario moved to takeout bin.'; }, error: 'Failed to takeout scenario.' }
      );
    },
  };

  // LOGIC STATS (Quality Index)
  const stats = useMemo(() => {
    const activeCases = testCases.filter(t => !t.isDeleted);
    const s = { passed: 0, failed: 0, pending: 0, progress: 0 };
    activeCases.forEach(t => {
      if (t.status === TEST_CASE_STATUS.PASS) s.passed++;
      else if (t.status === TEST_CASE_STATUS.FAIL) s.failed++;
      else s.pending++;
    });
    s.progress = activeCases.length ? Math.round((s.passed / activeCases.length) * 100) : 0;
    return s;
  }, [testCases]);

  // LOGIC GROUPING SUITES
  const groupedCases = useMemo(() => {
    const res = { 
        [TEST_CASE_TYPE.POSITIVE]: [] as any[], 
        [TEST_CASE_TYPE.NEGATIVE]: [] as any[] 
    };
    testCases.forEach(t => {
      const matchStatus = showDeleted ? t.isDeleted : !t.isDeleted;
      if (matchStatus) {
        if (t.type === TEST_CASE_TYPE.POSITIVE) res[TEST_CASE_TYPE.POSITIVE].push(t);
        else res[TEST_CASE_TYPE.NEGATIVE].push(t);
      }
    });
    return res;
  }, [testCases, showDeleted]);

  if (loading && !projects.length) return (
    <div className={`h-screen flex items-center justify-center text-[${THEME.TOSCA}] font-bold animate-pulse text-lg`}>
      Initializing UAT Console...
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-left">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className={`h-6 w-6 text-[${THEME.TOSCA}]`} /> UAT Execution Console
        </h2>
        <p className="text-sm text-gray-500">Manage and execute User Acceptance Testing for active projects.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Active UAT Projects</h3>
          <div className="space-y-2">
            {projects.map(p => (
              <div 
                key={p.id} 
                onClick={() => { setSelProject(p); fetchTestCases(p.id); }} 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${selProject?.id === p.id ? `bg-white border-[${THEME.TOSCA}] shadow-md ring-1 ring-[${THEME.TOSCA}]/10` : `bg-white border-gray-100 hover:border-[${THEME.TOSCA}]/30 shadow-sm`}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className={`text-sm font-bold truncate ${selProject?.id === p.id ? `text-[${THEME.TOSCA}]` : 'text-gray-800'}`}>{p.name}</h4>
                  {selProject?.id === p.id && <PlayCircle className={`h-4 w-4 text-[${THEME.TOSCA}]`} />}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="lg:col-span-3 space-y-6">
          {selProject ? (
            <>
              <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">{selProject.name}</h3>
                      <div className="flex gap-2 text-xs font-bold mt-1 uppercase tracking-wider">
                        <span className={`text-[${THEME.TOSCA}]`}>{stats.passed} Pass</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[#E11D48]">{stats.failed} Fail</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-400">{stats.pending} Pending</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Tombol Toggle ke Tab Takeout */}
                        <Button variant="outline" onClick={() => setShowDeleted(!showDeleted)} className={`h-10 gap-2 border-dashed transition-all ${showDeleted ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'text-gray-500 border-gray-300 hover:text-gray-700'}`}>
                            {showDeleted ? <LayoutList className="h-4 w-4"/> : <ArchiveX className="h-4 w-4"/>}
                            {showDeleted ? "Show Active" : "Takeout Cases"}
                        </Button>
                        <Button onClick={() => { setModal({ type: 'add' }); setForm({ title: "", type: TEST_CASE_TYPE.POSITIVE as string, notes: "", description: "", severity: "Low", takeoutReason: "" }); }} className={`bg-[${THEME.TOSCA}] hover:bg-[${THEME.TOSCA}]/80 text-white font-bold gap-2 shadow-md rounded-xl h-10 px-6`}>
                            <Plus className="h-4 w-4" /> Add Test Case
                        </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span className={`text-[${THEME.TOSCA}]`}>{stats.progress}% Quality Index</span>
                      <span className="text-gray-400">{testCases.filter(t => !t.isDeleted).length} Total Scenarios</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-[${THEME.TOSCA}] transition-all duration-1000 ease-out`} style={{ width: `${stats.progress}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {([TEST_CASE_TYPE.POSITIVE, TEST_CASE_TYPE.NEGATIVE] as const).map(type => {
                  const items = groupedCases[type]; 
                  return (
                    <div key={type} className="space-y-4">
                      <div className={`flex items-center gap-2 px-1 ${type === TEST_CASE_TYPE.POSITIVE ? `text-[${THEME.TOSCA}]` : `text-[${THEME.BSI_YELLOW}]`}`}>
                        <LayoutList className="h-4 w-4" />
                        <h4 className="font-black text-s uppercase tracking-widest">{type} Test Suite</h4>
                      </div>
                      <div className="animate-in slide-in-from-bottom-2 duration-500">
                        {items.map(tc => (
                          <TestCaseRow key={tc.id} item={tc} onAction={handleRowAction} />
                        ))}
                        {items.length === 0 && (
                            <div className="p-4 text-center text-xs text-gray-400 border border-dashed rounded-xl italic">
                                No {showDeleted ? 'taken out' : 'active'} items in this suite.
                            </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-100">
              <ShieldCheck className="h-16 w-16 mb-4 text-gray-100" />
              <p className="font-bold tracking-tight">Select a project to begin execution.</p>
            </div>
          )}
        </main>
      </div>

      {/* Modal General (Add, Edit, Pass, Fail) */}
      <Dialog open={['add', 'edit', 'pass', 'fail'].includes(modal.type || '')} onOpenChange={() => setModal({ type: null })}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[500px] text-left">
          <DialogHeader>
            <DialogTitle className={modal.type === 'fail' ? "text-[#E11D48]" : `text-[${THEME.TOSCA}]`}>
              {modal.type === 'add' && "Create New Scenario"}
              {modal.type === 'edit' && "Edit Scenario Notes"}
              {modal.type === 'pass' && "Validation Success"}
              {modal.type === 'fail' && "Log Defect Report"}
            </DialogTitle>
            <DialogDescription className="font-medium">{modal.item?.title || "Project: " + selProject?.name}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {modal.type === 'add' && (
              <>
                <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={`rounded-xl border-gray-100 focus-visible:ring-[${THEME.TOSCA}] h-11`} /></div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase text-gray-400">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                    <SelectTrigger className="rounded-xl border-gray-100 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={TEST_CASE_TYPE.POSITIVE}>Positive</SelectItem>
                      <SelectItem value={TEST_CASE_TYPE.NEGATIVE}>Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {(modal.type === 'add' || modal.type === 'edit' || modal.type === 'pass') && (
              <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">Notes / Remarks</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className={`rounded-xl border-gray-100 focus-visible:ring-[${THEME.TOSCA}] min-h-[120px]`} placeholder="Add technical observations..." /></div>
            )}

            {modal.type === 'fail' && (
              <>
                <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">Severity</Label><Select value={form.severity} onValueChange={v => setForm({...form, severity: v})}><SelectTrigger className="rounded-xl border-red-100 h-11 focus:ring-[#E11D48]"><SelectValue /></SelectTrigger><SelectContent className="bg-white">{["Low","Medium","High","Critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">Description</Label><Textarea placeholder="Expected result vs Actual result..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="rounded-xl border-red-100 focus-visible:ring-[#E11D48] min-h-[120px]" /></div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setModal({ type: null })} className="rounded-xl h-11 font-bold">Cancel</Button>
            <Button 
              onClick={() => modal.type === 'add' ? handleAction.add() : handleAction.update(modal.type === 'fail' ? TEST_CASE_STATUS.FAIL : modal.type === 'pass' ? TEST_CASE_STATUS.PASS : modal.item.status)} 
              className={`rounded-xl h-11 px-8 font-bold text-white transition-all ${modal.type === 'fail' ? 'bg-[#E11D48] hover:bg-[#be123c]' : `bg-[${THEME.TOSCA}] hover:bg-[${THEME.TOSCA}]/80`}`}
            >
              Confirm Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Khusus Takeout */}
      <Dialog open={modal.type === 'takeout'} onOpenChange={() => setModal({ type: null })}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[400px] text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-red-50 rounded-full text-red-600 ring-4 ring-red-50/50"><ArchiveX className="h-8 w-8" /></div>
            <div className="space-y-1"><h3 className="text-lg font-bold text-gray-900">Takeout Scenario?</h3><p className="text-sm text-gray-500">Provide a reason why this scenario is being taken out.</p></div>
          </div>
          
          <div className="mt-4 text-left space-y-1.5">
             <Label className="text-xs font-bold uppercase text-gray-400">Reason</Label>
             <Textarea 
                value={form.takeoutReason} 
                onChange={e => setForm({...form, takeoutReason: e.target.value})} 
                className="rounded-xl border-red-100 focus-visible:ring-[#E11D48] min-h-[100px]" 
                placeholder="E.g., Feature deprecated, logic changed, repeated fails..." 
             />
          </div>

          <DialogFooter className="mt-6 flex gap-2 w-full">
            <Button variant="outline" onClick={() => setModal({ type: null })} className="flex-1 rounded-xl h-11 font-bold">Cancel</Button>
            <Button onClick={handleAction.takeout} disabled={!form.takeoutReason.trim()} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white h-11 font-bold">Confirm Takeout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal View (Notes / Defect / Takeout Reason) */}
      <Dialog open={modal.type === 'view' || modal.type === 'view-takeout'} onOpenChange={() => setModal({ type: null })}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[500px] text-left">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {modal.type === 'view-takeout' ? <ArchiveX className="h-5 w-5 text-red-500"/> : modal.item?.status === TEST_CASE_STATUS.FAIL ? <AlertOctagon className="h-5 w-5 text-[#E11D48]"/> : <StickyNote className={`h-5 w-5 text-[${THEME.BSI_YELLOW}]`}/>}
              <DialogTitle>
                {modal.type === 'view-takeout' ? 'Takeout Reason' : modal.item?.status === TEST_CASE_STATUS.FAIL ? 'Defect Log' : 'Internal Notes'}
              </DialogTitle>
            </div>
            <DialogDescription className="font-bold text-gray-800 text-sm">{modal.item?.title}</DialogDescription>
          </DialogHeader>
          <div className="p-5 bg-gray-50 rounded-2xl text-sm text-gray-600 border border-gray-100 leading-relaxed shadow-inner">
            {modal.type === 'view-takeout' ? (
               <p className="whitespace-pre-wrap font-medium text-red-600">{modal.item?.notes?.replace('[TAKEOUT REASON]: ', '') || "No reason provided."}</p>
            ) : modal.item?.status === TEST_CASE_STATUS.FAIL && modal.item?.defect ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Severity:</span> <Badge className="bg-red-50 text-red-700 border-red-100 shadow-none text-[10px] font-black">{modal.item.defect.severity}</Badge></div>
                <div className="space-y-1"><span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Issue Summary:</span><p className="font-medium text-gray-700">{modal.item.defect.description}</p></div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap font-medium">{modal.item?.notes || "No additional information provided."}</p>
            )}
          </div>
          <DialogFooter><Button onClick={() => setModal({ type: null })} className={`bg-[${THEME.TOSCA}] hover:bg-[${THEME.TOSCA}]/80 text-white font-bold rounded-xl px-8 h-11`}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}