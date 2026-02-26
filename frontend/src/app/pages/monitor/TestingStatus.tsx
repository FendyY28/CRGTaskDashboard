import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { ShieldCheck, PlayCircle, LayoutList, Plus, ArchiveX } from "lucide-react";
import { Button } from "../../components/ui/button";
import { TEST_CASE_STATUS, TEST_CASE_TYPE, THEME } from "../../constants/projectConstants";
import { useTestCases } from "../../hooks/useTestCases";
import { toast } from "sonner";

// Imports hasil pemisahan komponen
import { TestCaseRow } from "../../components/features/testing/TestCaseRow";
import { TestingModals } from "../../components/features/testing/TestingModals";

export function TestingStatus() {
  const { 
    projects, testCases, loading, 
    fetchUatProjects, fetchTestCases, updateTestCase 
  } = useTestCases();

  const [selProject, setSelProject] = useState<any | null>(null);
  const [modal, setModal] = useState<{ type: string | null, item?: any }>({ type: null });
  const [showDeleted, setShowDeleted] = useState(false);

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
  }, [updateTestCase, selProject]);

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

  const groupedCases = useMemo(() => {
    const res = { [TEST_CASE_TYPE.POSITIVE]: [] as any[], [TEST_CASE_TYPE.NEGATIVE]: [] as any[] };
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
    <div className="h-screen flex items-center justify-center font-bold animate-pulse text-lg" style={{ color: THEME.TOSCA }}>
      Initializing UAT Console...
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-left">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" style={{ color: THEME.TOSCA }} /> UAT Execution Console
        </h2>
        <p className="text-sm text-gray-500">Manage and execute User Acceptance Testing for active projects.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Projects */}
        <aside className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Active UAT Projects</h3>
          <div className="space-y-2">
            {projects.map(p => (
              <div 
                key={p.id} 
                onClick={() => { setSelProject(p); fetchTestCases(p.id); }} 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${selProject?.id === p.id ? 'bg-white shadow-md ring-1' : 'bg-white border-gray-100 shadow-sm'}`}
                style={selProject?.id === p.id ? { borderColor: THEME.TOSCA, boxShadow: `0 0 0 1px ${THEME.TOSCA}1A` } : {}}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold truncate" style={{ color: selProject?.id === p.id ? THEME.TOSCA : '#1F2937' }}>{p.name}</h4>
                  {selProject?.id === p.id && <PlayCircle className="h-4 w-4" style={{ color: THEME.TOSCA }} />}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-6">
          {selProject ? (
            <>
              <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">{selProject.name}</h3>
                      <div className="flex gap-2 text-xs font-bold mt-1 uppercase tracking-wider">
                        <span style={{ color: THEME.TOSCA }}>{stats.passed} Pass</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[#E11D48]">{stats.failed} Fail</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-400">{stats.pending} Pending</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setShowDeleted(!showDeleted)} className={`h-10 gap-2 border-dashed transition-all ${showDeleted ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'text-gray-500 border-gray-300 hover:text-gray-700'}`}>
                            {showDeleted ? <LayoutList className="h-4 w-4"/> : <ArchiveX className="h-4 w-4"/>}
                            {showDeleted ? "Show Active" : "Takeout Cases"}
                        </Button>
                        <Button onClick={() => setModal({ type: 'add' })} className="text-white font-bold gap-2 shadow-md rounded-xl h-10 px-6 hover:opacity-90 transition-opacity" style={{ backgroundColor: THEME.TOSCA }}>
                            <Plus className="h-4 w-4" /> Add Test Case
                        </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span style={{ color: THEME.TOSCA }}>{stats.progress}% Quality Index</span>
                      <span className="text-gray-400">{testCases.filter(t => !t.isDeleted).length} Total Scenarios</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${stats.progress}%`, backgroundColor: THEME.TOSCA }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {([TEST_CASE_TYPE.POSITIVE, TEST_CASE_TYPE.NEGATIVE] as const).map(type => {
                  const items = groupedCases[type]; 
                  return (
                    <div key={type} className="space-y-4">
                      <div className="flex items-center gap-2 px-1" style={{ color: type === TEST_CASE_TYPE.POSITIVE ? THEME.TOSCA : THEME.BSI_YELLOW }}>
                        <LayoutList className="h-4 w-4" />
                        <h4 className="font-black text-sm uppercase tracking-widest">{type} Test Suite</h4>
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

      <TestingModals 
        modal={modal} 
        selProject={selProject} 
        onClose={() => setModal({ type: null })} 
        onSuccess={() => fetchTestCases(selProject.id)}
      />
    </div>
  );
}