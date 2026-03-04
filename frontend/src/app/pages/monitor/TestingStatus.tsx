import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { ShieldCheck, PlayCircle, LayoutList, Plus, ArchiveX } from "lucide-react";
import { Button } from "../../components/ui/button";
import { TEST_CASE_STATUS, TEST_CASE_TYPE, THEME } from "../../constants/projectConstants";
import { useTestCases } from "../../hooks/useTestCases";
import { toast } from "sonner";

import { TestCaseRow } from "../../components/features/testing/TestCaseRow";
import { TestingModals } from "../../components/features/testing/TestingModals";
import { ProtectAction } from "../../components/auth/ProtectAction";

import { useTranslation } from "react-i18next";

export function TestingStatus() {
  const { 
    projects, testCases, loading: isLoading, 
    fetchUatProjects, fetchTestCases, updateTestCase 
  } = useTestCases();

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeModal, setActiveModal] = useState<{ type: string | null, item?: any }>({ type: null });
  const [isShowingDeleted, setIsShowingDeleted] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    fetchUatProjects().then(fetchedProjects => {
      if (fetchedProjects && fetchedProjects.length > 0) {
        setSelectedProject(fetchedProjects[0]);
        fetchTestCases(fetchedProjects[0].id);
      }
    });
  }, [fetchUatProjects, fetchTestCases]);

  const handleTestCaseAction = useCallback(async (actionType: string, targetTestCase: any) => {
    if (actionType === 'reset') {
      toast.promise(
        updateTestCase(targetTestCase.id, { status: TEST_CASE_STATUS.PENDING, notes: null }, selectedProject.id),
        { 
          loading: t('testing.toast.resetting'), 
          success: t('testing.toast.resetSuccess'), 
          error: t('testing.toast.resetFail') 
        }
      );
      return;
    }
    setActiveModal({ type: actionType, item: targetTestCase });
  }, [updateTestCase, selectedProject, t]);

  const executionStats = useMemo(() => {
    const activeTestCases = testCases.filter(testCase => !testCase.isDeleted);
    const calculatedStats = { passedCount: 0, failedCount: 0, pendingCount: 0, progressPercentage: 0 };
    
    activeTestCases.forEach(testCase => {
      if (testCase.status === TEST_CASE_STATUS.PASS) calculatedStats.passedCount++;
      else if (testCase.status === TEST_CASE_STATUS.FAIL) calculatedStats.failedCount++;
      else calculatedStats.pendingCount++;
    });
    
    calculatedStats.progressPercentage = activeTestCases.length 
        ? Math.round((calculatedStats.passedCount / activeTestCases.length) * 100) 
        : 0;
        
    return calculatedStats;
  }, [testCases]);

  const testCasesBySuite = useMemo(() => {
    const categorizedSuites = { 
        [TEST_CASE_TYPE.POSITIVE]: [] as any[], 
        [TEST_CASE_TYPE.NEGATIVE]: [] as any[] 
    };
    
    testCases.forEach(testCase => {
      const isMatchingCurrentView = isShowingDeleted ? testCase.isDeleted : !testCase.isDeleted;
      if (isMatchingCurrentView) {
        if (testCase.type === TEST_CASE_TYPE.POSITIVE) categorizedSuites[TEST_CASE_TYPE.POSITIVE].push(testCase);
        else categorizedSuites[TEST_CASE_TYPE.NEGATIVE].push(testCase);
      }
    });
    
    return categorizedSuites;
  }, [testCases, isShowingDeleted]);

  if (isLoading && !projects.length) return (
    <div className="h-screen flex items-center justify-center font-bold animate-pulse text-lg" style={{ color: THEME.TOSCA }}>
      {t('testing.loading')}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-left">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" style={{ color: THEME.TOSCA }} /> {t('testing.title')}
        </h2>
        <p className="text-sm text-gray-500">{t('testing.description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Projects */}
        <aside className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('testing.sidebarTitle')}</h3>
          <div className="space-y-2">
            {projects.map(project => (
              <div 
                key={project.id} 
                onClick={() => { setSelectedProject(project); fetchTestCases(project.id); }} 
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${selectedProject?.id === project.id ? 'bg-white shadow-md ring-1' : 'bg-white border-gray-100 shadow-sm'}`}
                style={selectedProject?.id === project.id ? { borderColor: THEME.TOSCA, boxShadow: `0 0 0 1px ${THEME.TOSCA}1A` } : {}}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold truncate" style={{ color: selectedProject?.id === project.id ? THEME.TOSCA : '#1F2937' }}>{project.name}</h4>
                  {selectedProject?.id === project.id && <PlayCircle className="h-4 w-4" style={{ color: THEME.TOSCA }} />}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-6">
          {selectedProject ? (
            <>
              <Card className="border-none shadow-sm ring-1 ring-gray-200 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">{selectedProject.name}</h3>
                      <div className="flex gap-2 text-xs font-bold mt-1 uppercase tracking-wider">
                        <span style={{ color: THEME.TOSCA }}>{executionStats.passedCount} {t('testing.stats.pass')}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[#E11D48]">{executionStats.failedCount} {t('testing.stats.fail')}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-400">{executionStats.pendingCount} {t('testing.stats.pending')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setIsShowingDeleted(!isShowingDeleted)} className={`h-10 gap-2 border-dashed transition-all ${isShowingDeleted ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'text-gray-500 border-gray-300 hover:text-gray-700'}`}>
                            {isShowingDeleted ? <LayoutList className="h-4 w-4"/> : <ArchiveX className="h-4 w-4"/>}
                            {isShowingDeleted ? t('testing.buttons.showActive') : t('testing.buttons.takeoutCases')}
                        </Button>

                        <ProtectAction>
                          <Button onClick={() => setActiveModal({ type: 'add' })} className="text-white font-bold gap-2 shadow-md rounded-xl h-10 px-6 hover:opacity-90 transition-opacity" style={{ backgroundColor: THEME.TOSCA }}>
                              <Plus className="h-4 w-4" /> {t('testing.buttons.addTestCase')}
                          </Button>
                        </ProtectAction>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span style={{ color: THEME.TOSCA }}>{executionStats.progressPercentage}% {t('testing.stats.qualityIndex')}</span>
                      <span className="text-gray-400">{testCases.filter(testCase => !testCase.isDeleted).length} {t('testing.stats.totalScenarios')}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${executionStats.progressPercentage}%`, backgroundColor: THEME.TOSCA }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {([TEST_CASE_TYPE.POSITIVE, TEST_CASE_TYPE.NEGATIVE] as const).map(suiteType => {
                  const testCasesInSuite = testCasesBySuite[suiteType]; 
                  return (
                    <div key={suiteType} className="space-y-4">
                      <div className="flex items-center gap-2 px-1" style={{ color: suiteType === TEST_CASE_TYPE.POSITIVE ? THEME.TOSCA : THEME.BSI_YELLOW }}>
                        <LayoutList className="h-4 w-4" />
                        <h4 className="font-black text-sm uppercase tracking-widest">{t(`testing.suite.${suiteType.toLowerCase()}`)}</h4>
                      </div>
                      <div className="animate-in slide-in-from-bottom-2 duration-500">
                        {testCasesInSuite.map(testCase => (
                          <TestCaseRow key={testCase.id} item={testCase} onAction={handleTestCaseAction} />
                        ))}
                        {testCasesInSuite.length === 0 && (
                            <div className="p-4 text-center text-xs text-gray-400 border border-dashed rounded-xl italic">
                                {isShowingDeleted ? t('testing.suite.noTakenOut') : t('testing.suite.noActive')}
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
              <p className="font-bold tracking-tight">{t('testing.emptyState')}</p>
            </div>
          )}
        </main>
      </div>

        <TestingModals 
          modal={activeModal} 
          selProject={selectedProject} 
          onClose={() => setActiveModal({ type: null })} 
          onSuccess={() => fetchTestCases(selectedProject.id)}
        />
    </div>
  );
}