import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";
import { THEME } from "../constants/projectConstants";

// 🔥 TERIMA PARAMETER array string berisi ID project yang difilter
export function useAnalyticsData(selectedProjectIds: string[] = []) {
  const { t } = useTranslation();
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [allTestCases, setAllTestCases] = useState<any[]>([]);

  // Label Dinamis
  const openLbl = t('pir.tabs.open') || 'Open';
  const inProgressLbl = t('pir.tabs.in-progress') || 'In Progress';
  const resolvedLbl = t('pir.tabs.resolved') || 'Resolved';
  const takeoutLbl = t('testing.row.takenOut') || 'Takeout';

  // 1. FETCH SEMUA DATA SEKALI SAJA SAAT MOUNT
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const [prjRes, issRes, tcRes] = await Promise.all([
          api.get('/project'),
          api.get('/project/issue'),
          api.get('/project').then((res: any[]) => {
            const uatProjects = res.filter(p => p.currentPhase === 'UAT');
            return Promise.all(uatProjects.map(p => api.get(`/project/${p.id}/test-cases`)));
          }).then(res => res.flat())
        ]);

        setAllProjects(Array.isArray(prjRes) ? prjRes : []);
        setAllIssues(Array.isArray(issRes) ? issRes : []);
        setAllTestCases(Array.isArray(tcRes) ? tcRes : []);
      } catch (error) {
        console.error("Failed to fetch analytics data", error);
      }
    };
    fetchAnalyticsData();
  }, []);

  // 2. 🔥 DATA MENTAH YANG SUDAH DIFILTER (Ini yang akan dipakai oleh semua chart)
  const { projects, issues, testCases } = useMemo(() => {
    // Jika tidak ada filter (kosong), kembalikan semua data
    if (!selectedProjectIds || selectedProjectIds.length === 0) {
      return { projects: allProjects, issues: allIssues, testCases: allTestCases };
    }

    // Jika ada filter, saring data berdasarkan ID project yang dipilih
    return {
      projects: allProjects.filter(p => selectedProjectIds.includes(p.id)),
      issues: allIssues.filter(i => selectedProjectIds.includes(i.projectId)), // Pastikan property 'projectId' sesuai DB
      testCases: allTestCases.filter(tc => selectedProjectIds.includes(tc.projectId)), // Pastikan property 'projectId' sesuai DB
    };
  }, [allProjects, allIssues, allTestCases, selectedProjectIds]);


  // 3. KALKULASI CHART (Memakai data yang sudah difilter di atas)
  
  const statusData = useMemo(() => {
    const counts = { 'on-track': 0, 'at-risk': 0, 'overdue': 0, 'completed': 0 };
    projects.forEach(p => { 
      if (counts[p.status as keyof typeof counts] !== undefined) {
        counts[p.status as keyof typeof counts]++; 
      }
    });
    return [
      { name: 'On Track', value: counts['on-track'], color: THEME.TOSCA },
      { name: 'At Risk', value: counts['at-risk'], color: THEME.BSI_YELLOW },
      { name: 'Overdue', value: counts['overdue'], color: '#E11D48' },
      { name: 'Completed', value: counts['completed'], color: THEME.BSI_GREEN },
    ].filter(d => d.value > 0);
  }, [projects]);

  const averageProgressData = useMemo(() => {
    const phases = ["Req", "TF", "Dev", "SIT", "UAT", "Live"];
    const fullPhases = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];
    return phases.map((phase, index) => {
      const projsInPhase = projects.filter(p => p.currentPhase === fullPhases[index]);
      const avg = projsInPhase.length > 0 
        ? Math.round(projsInPhase.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / projsInPhase.length)
        : 0;
      return { name: phase, Average: avg, projectCount: projsInPhase.length };
    });
  }, [projects]);

  const phaseData = useMemo(() => {
    const phases = ["Req", "TF", "Dev", "SIT", "UAT", "Live"];
    const fullPhases = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];
    return phases.map((phase, index) => ({
      name: phase,
      [t('analytics.labels.projects')]: projects.filter(p => p.currentPhase === fullPhases[index]).length
    }));
  }, [projects, t]);

  const uatData = useMemo(() => {
    const counts = { pass: 0, fail: 0, pending: 0, takeout: 0 };
    testCases.forEach(tc => {
      if (tc.isDeleted) counts.takeout++;
      else if (tc.status === 'pass') counts.pass++;
      else if (tc.status === 'fail') counts.fail++;
      else counts.pending++;
    });
    return [
      { name: 'Passed', value: counts.pass, color: THEME.BSI_GREEN },
      { name: 'Failed', value: counts.fail, color: '#E11D48' },
      { name: 'Pending', value: counts.pending, color: THEME.BSI_YELLOW },
      { name: takeoutLbl, value: counts.takeout, color: '#9CA3AF' },
    ].filter(d => d.value > 0);
  }, [testCases, takeoutLbl]);

  const issueData = useMemo(() => {
    type PriorityData = { name: string; [key: string]: any };
    const dataMap: Record<string, PriorityData> = {
      critical: { name: t('pir.priorities.critical'), [openLbl]: 0, [inProgressLbl]: 0 },
      high: { name: t('pir.priorities.high'), [openLbl]: 0, [inProgressLbl]: 0 },
      medium: { name: t('pir.priorities.medium'), [openLbl]: 0, [inProgressLbl]: 0 },
      low: { name: t('pir.priorities.low'), [openLbl]: 0, [inProgressLbl]: 0 },
    };

    issues.forEach(i => {
      const p = i.priority?.toLowerCase();
      const s = i.status?.toLowerCase();
      const targetPriority = dataMap[p]; 
      if (targetPriority && s !== 'resolved') {
        if (s === 'in progress' || s === 'in-progress') targetPriority[inProgressLbl]++;
        else if (s === 'open') targetPriority[openLbl]++;
      }
    });
    return [dataMap.critical, dataMap.high, dataMap.medium, dataMap.low];
  }, [issues, t, openLbl, inProgressLbl]);

  const issueResolutionData = useMemo(() => {
    const counts = { open: 0, 'in progress': 0, resolved: 0 };
    issues.forEach(i => {
      const s = i.status?.toLowerCase();
      if (s === 'open') counts.open++;
      else if (s === 'in progress' || s === 'in-progress') counts['in progress']++;
      else if (s === 'resolved') counts.resolved++;
    });
    return [
      { name: resolvedLbl, value: counts.resolved, color: THEME.BSI_GREEN },
      { name: inProgressLbl, value: counts['in progress'], color: '#0284C7' },
      { name: openLbl, value: counts.open, color: '#E11D48' },
    ].filter(d => d.value > 0);
  }, [issues, openLbl, inProgressLbl, resolvedLbl]);

  const topDefectsData = useMemo(() => {
    const projectFailMap: Record<string, number> = {};

    testCases.forEach(tc => {
      if (!tc.isDeleted && tc.status === 'fail') {
        const pId = tc.projectId || 'Unknown';
        if (!projectFailMap[pId]) projectFailMap[pId] = 0;
        projectFailMap[pId]++;
      }
    });

    const sortedFails = Object.entries(projectFailMap)
      .map(([id, fails]) => {
        // 🔥 Perbaikan: Cari nama project dari allProjects agar tetap ketemu meskipun project tsb tidak sedang difilter
        const projectMatch = allProjects.find(p => String(p.id) === String(id));
        const projectName = projectMatch ? projectMatch.name : `PRJ-${id}`;
        
        const shortName = projectName.length > 15 ? projectName.substring(0, 15) + '...' : projectName;
        return { name: shortName, Fails: fails };
      })
      .sort((a, b) => b.Fails - a.Fails)
      .slice(0, 5); 

    return sortedFails;
  }, [testCases, allProjects]);

  return { 
    // 🔥 Kirim list semua project ke UI untuk dropdown
    availableProjects: allProjects.map(p => ({ id: p.id, name: p.name })),
    
    statusData, averageProgressData, phaseData, 
    uatData, issueData, issueResolutionData, 
    openLbl, inProgressLbl, topDefectsData
  };
}