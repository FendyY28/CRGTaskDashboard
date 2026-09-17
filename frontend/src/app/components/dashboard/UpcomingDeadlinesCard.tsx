import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../../types";
import { THEME } from "../../constants/projectConstants";
import { DashboardCard } from "./DashboardCard";
import { useTranslation } from "react-i18next";

interface UpcomingDeadlinesCardProps {
  projects: Project[];
}

interface DeadlineItem {
  project: Project;
  phaseName: string;
  deadline: Date;
  daysLeft: number;
}

export function UpcomingDeadlinesCard({ projects }: UpcomingDeadlinesCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const deadlines: DeadlineItem[] = projects
    .flatMap((project) => {
      const phase = project.sdlcPhases?.find(
        (p) =>
          p.phaseName === project.currentPhase &&
          p.cycle === (project.cycle || 1),
      );
      const rawDeadline = phase?.deadline || project.projectDeadline;
      const deadline = rawDeadline ? new Date(rawDeadline) : null;
      if (!deadline || Number.isNaN(deadline.getTime())) return [];
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / dayMs);
      return daysLeft <= 14 && project.status !== "completed"
        ? [{ project, phaseName: phase?.phaseName || project.currentPhase, deadline, daysLeft }]
        : [];
    })
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 6);

  const urgentProjects = projects.filter(
    (project) => project.status === "at-risk" || project.status === "overdue",
  );

  return (
    <DashboardCard
      icon={CalendarClock}
      color={THEME.BSI_YELLOW}
      title={t("upcoming.title", "Upcoming Deadlines & Alerts")}
      className="h-full"
      contentClassName="pt-4 space-y-3"
    >
      {urgentProjects.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border-red-100 bg-red-50 p-3 text-left">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-red-700">
              {t("upcoming.urgent", "Urgent project alerts")}
            </p>
            <p className="text-[11px] text-red-600">
              {urgentProjects.length} {t("upcoming.urgentDescription", "project(s) require attention")}
            </p>
          </div>
        </div>
      )}

      {deadlines.length === 0 && urgentProjects.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          {t("upcoming.empty", "No upcoming deadlines or urgent alerts.")}
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((item) => {
            const overdue = item.daysLeft < 0;
            return (
              <button
                key={`${item.project.id}-${item.phaseName}`}
                onClick={() => navigate(`/audit-trail?projectId=${encodeURIComponent(item.project.id)}`)}
                className="flex w-full items-center gap-3 rounded-lg border-gray-100 bg-gray-50/70 p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
              >
                <CalendarClock
                  className={`h-4 w-4 shrink-0 ${overdue ? "text-red-500" : item.daysLeft <= 7 ? "text-amber-500" : "text-gray-400"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-gray-800">{item.project.name}</span>
                  <span className="block truncate text-[10px] text-gray-500">
                    {item.phaseName} · {item.deadline.toLocaleDateString()}
                  </span>
                </span>
                <span className={`shrink-0 text-[10px] font-bold ${overdue ? "text-red-600" : item.daysLeft <= 7 ? "text-amber-600" : "text-gray-500"}`}>
                  {overdue ? t("upcoming.overdue", "Overdue") : `${item.daysLeft} ${t("upcoming.days", "days")}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate("/audit-trail")}
        className="flex w-full items-center justify-center gap-2 border-t border-gray-100 pt-3 text-xs font-bold text-[#38A79C] hover:text-[#267d76]"
      >
        {t("upcoming.auditTrail", "Open System Audit Trail")} <ArrowRight className="h-3.5 w-3.5" /> <ExternalLink className="h-3 w-3" />
      </button>
    </DashboardCard>
  );
}
