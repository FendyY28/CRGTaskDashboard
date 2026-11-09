import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "../../ui/card";
import {
  ShieldCheck,
  LayoutList,
  Plus,
  ArchiveX,
  Search,
  X,
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  TEST_CASE_STATUS,
  TEST_CASE_TYPE,
  THEME,
} from "../../../constants/projectConstants";
import { useTestCases } from "../../../hooks/useTestCases";
import { toast } from "sonner";

import { TestCaseRow } from "./TestCaseRow";
import { TestingModals } from "../../modals/TestingModals";
import { ProtectAction } from "../../auth/ProtectAction";
import { ProjectSidebar } from "../../layouts/ProjectSidebar";

import { useTranslation } from "react-i18next";

interface TestingConsoleProps {
  /** Label of the page (kept for callers); projects are not filtered by phase. */
  phase?: string;
  /** Translation namespace holding the page copy: `sit` or `testing`. */
  ns: string;
}

/**
 * Shared execution console for the SIT and UAT pages. Both pages list every
 * project regardless of its current phase, so only the copy differs.
 */
export function TestingConsole({ ns }: TestingConsoleProps) {
  const {
    projects,
    testCases,
    loading: isLoading,
    fetchUatProjects,
    fetchTestCases,
    updateTestCase,
  } = useTestCases();

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: string | null;
    item?: any;
  }>({ type: null });
  const [isShowingDeleted, setIsShowingDeleted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "pass" | "fail"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { t } = useTranslation();

  useEffect(() => {
    fetchUatProjects().then((fetchedProjects) => {
      if (fetchedProjects && fetchedProjects.length > 0) {
        setSelectedProject(fetchedProjects[0]);
        fetchTestCases(fetchedProjects[0].id);
      }
    });
  }, [fetchUatProjects, fetchTestCases]);

  const handleTestCaseAction = useCallback(
    async (actionType: string, targetTestCase: any) => {
      if (actionType === "reset") {
        toast.promise(
          updateTestCase(
            targetTestCase.id,
            { status: TEST_CASE_STATUS.PENDING, notes: undefined },
            selectedProject.id,
          ),
          {
            loading: t(`${ns}.toast.resetting`),
            success: t(`${ns}.toast.resetSuccess`),
            error: t(`${ns}.toast.resetFail`),
          },
        );
        return;
      }
      setActiveModal({ type: actionType, item: targetTestCase });
    },
    [updateTestCase, selectedProject, t, ns],
  );

  const executionStats = useMemo(() => {
    const activeTestCases = testCases.filter((testCase) => !testCase.isDeleted);
    const calculatedStats = {
      passedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      progressPercentage: 0,
    };

    activeTestCases.forEach((testCase) => {
      if (testCase.status === TEST_CASE_STATUS.PASS)
        calculatedStats.passedCount++;
      else if (testCase.status === TEST_CASE_STATUS.FAIL)
        calculatedStats.failedCount++;
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
      [TEST_CASE_TYPE.NEGATIVE]: [] as any[],
    };

    const query = searchQuery.trim().toLowerCase();

    testCases.forEach((testCase) => {
      const isMatchingCurrentView = isShowingDeleted
        ? testCase.isDeleted
        : !testCase.isDeleted;
      if (!isMatchingCurrentView) return;

      if (statusFilter !== "all" && testCase.status !== statusFilter) return;

      if (
        query &&
        ![
          testCase.title,
          testCase.notes,
          testCase.defect?.description,
          testCase.defect?.severity,
          testCase.updatedBy,
        ].some(
          (field) =>
            typeof field === "string" && field.toLowerCase().includes(query),
        )
      )
        return;

      if (testCase.type === TEST_CASE_TYPE.POSITIVE)
        categorizedSuites[TEST_CASE_TYPE.POSITIVE].push(testCase);
      else categorizedSuites[TEST_CASE_TYPE.NEGATIVE].push(testCase);
    });

    return categorizedSuites;
  }, [testCases, isShowingDeleted, statusFilter, searchQuery]);

  const visibleCount =
    testCasesBySuite[TEST_CASE_TYPE.POSITIVE].length +
    testCasesBySuite[TEST_CASE_TYPE.NEGATIVE].length;
  const isFiltering = statusFilter !== "all" || searchQuery.trim() !== "";

  const statusFilterItems = useMemo(
    () => [
      {
        key: "all" as const,
        label: t(`${ns}.filter.all`),
        count: testCases.filter((testCase) =>
          isShowingDeleted ? testCase.isDeleted : !testCase.isDeleted,
        ).length,
      },
      {
        key: "pending" as const,
        label: t(`${ns}.filter.pending`),
        count: executionStats.pendingCount,
      },
      {
        key: "pass" as const,
        label: t(`${ns}.filter.pass`),
        count: executionStats.passedCount,
      },
      {
        key: "fail" as const,
        label: t(`${ns}.filter.fail`),
        count: executionStats.failedCount,
      },
    ],
    [testCases, isShowingDeleted, executionStats, t, ns],
  );

  const resetFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  if (isLoading && !projects.length)
    return (
      <div
        className="h-screen flex items-center justify-center font-bold animate-pulse text-lg"
        style={{ color: THEME.TOSCA }}
      >
        {t(`${ns}.loading`)}
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-left relative">
      <div className="flex flex-col gap-1 mb-8 pb-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2 drop-shadow-xs">
          <ShieldCheck className="h-6 w-6 text-white" /> {t(`${ns}.title`)}
        </h2>
        <p className="text-sm text-white/90 font-medium drop-shadow-xs">
          {t(`${ns}.description`)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR: sticky agar daftar proyek tidak ikut tergulir di halaman panjang */}
        <div className="lg:col-span-1 lg:self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <ProjectSidebar
            title={t(`${ns}.sidebarTitle`)}
            projects={projects}
            selectedProject={selectedProject}
            onProjectSelect={(project) => {
              setSelectedProject(project);
              fetchTestCases(project.id);
              resetFilters();
            }}
            emptyStateText={t(`${ns}.noProjects`)}
          />
        </div>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-6">
          {selectedProject ? (
            <>
              {/* STICKY HEADER: statistik, filter, dan aksi tetap terlihat saat scroll.
                  `top-16` = tinggi Header aplikasi (h-16), agar menempel tepat di bawahnya. */}
              <div
                className="sticky top-16 z-20 -mx-1 px-1 pb-2"
                data-testid="testing-sticky-header"
              >
                <Card className="border border-white/60 shadow-xl shadow-teal-950/5 ring-1 ring-black/5 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
                  <CardContent className="px-4 py-3 sm:px-5">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                      <div className="text-left min-w-0 flex-1 md:mr-6">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            {selectedProject.name}
                          </h3>
                          <span
                            className="shrink-0 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: THEME.TOSCA }}
                          >
                            {executionStats.progressPercentage}%{" "}
                            {t(`${ns}.stats.qualityIndex`)}
                            <span className="text-gray-400 ml-2 normal-case">
                              {
                                testCases.filter(
                                  (testCase) => !testCase.isDeleted,
                                ).length
                              }{" "}
                              {t(`${ns}.stats.totalScenarios`)}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${executionStats.progressPercentage}%`,
                              backgroundColor: THEME.TOSCA,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsShowingDeleted(!isShowingDeleted)}
                          className={`h-9 gap-2 border-dashed transition-all ${isShowingDeleted ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}
                        >
                          {isShowingDeleted ? (
                            <LayoutList className="h-4 w-4" />
                          ) : (
                            <ArchiveX className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            {isShowingDeleted
                              ? t(`${ns}.buttons.showActive`)
                              : t(`${ns}.buttons.takeoutCases`)}
                          </span>
                        </Button>

                        <ProtectAction>
                          <Button
                            onClick={() => setActiveModal({ type: "add" })}
                            className="bg-gradient-to-r from-[#F8AD3C] to-[#F59E0B] text-white font-extrabold gap-2 shadow-lg shadow-amber-950/20 rounded-xl h-9 px-4 hover:scale-[1.02] transition-all border border-amber-300/30 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />{" "}
                            <span className="hidden sm:inline">
                              {t(`${ns}.buttons.addTestCase`)}
                            </span>
                          </Button>
                        </ProtectAction>
                      </div>
                    </div>

                    {/* SEARCH */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t(`${ns}.search.placeholder`)}
                          className="w-full h-9 pl-9 pr-9 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#38A79C]/30 focus:border-[#38A79C] focus:bg-white placeholder-gray-400 font-medium transition-all"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-0.5"
                            aria-label={t(`${ns}.search.clear`)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* STATUS FILTER */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {statusFilterItems.map(({ key, label, count }) => {
                        const isSelected = statusFilter === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter(key)}
                            aria-pressed={isSelected}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer border ${isSelected ? "bg-white shadow-sm ring-1 ring-black/5" : "bg-gray-100/70 text-gray-700 hover:bg-gray-200/80 border-gray-200/60"}`}
                            style={
                              isSelected
                                ? {
                                    color: THEME.TOSCA,
                                    borderColor: THEME.TOSCA,
                                  }
                                : {}
                            }
                          >
                            {label} <span className="opacity-60">{count}</span>
                          </button>
                        );
                      })}
                      {isFiltering && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="px-2 py-1 text-[11px] font-bold text-gray-400 hover:text-gray-700 hover:underline"
                        >
                          {t(`${ns}.filter.clear`)}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Empty state saat filter tidak menemukan hasil */}
              {visibleCount === 0 && isFiltering && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-gray-700 bg-white/95 backdrop-blur-md border border-white/60 shadow-lg shadow-teal-950/5 rounded-2xl font-bold">
                  <Search className="h-8 w-8 mb-2 text-[#38A79C]/30" />
                  {t(`${ns}.search.noResults`)}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 text-xs font-bold text-[#38A79C] hover:underline"
                  >
                    {t(`${ns}.filter.clear`)}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {(
                  [TEST_CASE_TYPE.POSITIVE, TEST_CASE_TYPE.NEGATIVE] as const
                ).map((suiteType) => {
                  const testCasesInSuite = testCasesBySuite[suiteType];
                  return (
                    <div key={suiteType} className="space-y-3">
                      <div
                        className="flex items-center gap-2 px-1"
                        style={{
                          color:
                            suiteType === TEST_CASE_TYPE.POSITIVE
                              ? THEME.TOSCA
                              : THEME.BSI_YELLOW,
                        }}
                      >
                        <LayoutList className="h-4 w-4" />
                        <h4 className="font-black text-sm uppercase tracking-widest">
                          {t(`${ns}.suite.${suiteType.toLowerCase()}`)}
                        </h4>
                        <span className="text-[11px] font-bold opacity-60">
                          {testCasesInSuite.length}
                        </span>
                      </div>
                      <div className="animate-in slide-in-from-bottom-2 duration-500">
                        {testCasesInSuite.map((testCase) => (
                          <TestCaseRow
                            key={testCase.id}
                            item={testCase}
                            onAction={handleTestCaseAction}
                            ns={ns}
                          />
                        ))}
                        {testCasesInSuite.length === 0 && (
                          <div className="p-5 text-center text-xs text-gray-700 bg-white/95 backdrop-blur-md border border-white/60 shadow-lg shadow-teal-950/5 rounded-2xl font-bold">
                            {isFiltering
                              ? t(`${ns}.search.noResults`)
                              : isShowingDeleted
                                ? t(`${ns}.suite.noTakenOut`)
                                : t(`${ns}.suite.noActive`)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-700 bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl shadow-teal-950/5 p-8">
              <ShieldCheck className="h-16 w-16 mb-4 text-[#00A39D]/30" />
              <p className="font-bold text-base text-gray-800 tracking-tight">
                {t(`${ns}.emptyState`)}
              </p>
            </div>
          )}
        </main>
      </div>

      <TestingModals
        modal={activeModal}
        selProject={selectedProject}
        onClose={() => setActiveModal({ type: null })}
        onSuccess={() => fetchTestCases(selectedProject.id)}
        ns={ns}
      />
    </div>
  );
}
