import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ExternalLink,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "id-ID";

  const deadlines: DeadlineItem[] = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMs = 24 * 60 * 60 * 1000;

    return projects
    .flatMap((project) => {
      const phase = project.sdlcPhases?.find(
        (p) =>
          p.phaseName === project.currentPhase &&
          p.cycle === (project.cycle || 1),
      );
      if (phase && (phase.status === "completed" || phase.status === "done")) {
        return [];
      }

      const phaseName = (phase?.phaseName || project.currentPhase || "").trim();
      if (!phaseName) return [];

      const rawDeadline = phase?.deadline || project.projectDeadline;
      const deadline = rawDeadline ? new Date(rawDeadline) : null;
      if (!deadline || Number.isNaN(deadline.getTime())) return [];

      const deadlineDay = new Date(
        deadline.getFullYear(),
        deadline.getMonth(),
        deadline.getDate(),
      );
      const daysLeft = Math.round((deadlineDay.getTime() - today.getTime()) / dayMs);

      return daysLeft <= 14 && project.status !== "completed"
        ? [
            {
              project,
              phaseName,
              deadline,
              daysLeft,
            },
          ]
        : [];
    })
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 6);
  }, [projects]);

  const urgentProjects = useMemo(
    () =>
      projects.filter(
        (p) => p.status === "at-risk" || p.status === "overdue",
      ),
    [projects],
  );

  const BADGE_BASE =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]";

  const badgeClass = (daysLeft: number) => {
    if (daysLeft <= 3)
      return `${BADGE_BASE} border-amber-200 bg-amber-50 font-bold text-amber-700`;
    if (daysLeft <= 7)
      return `${BADGE_BASE} border-yellow-200 bg-yellow-50 font-semibold text-yellow-700`;
    return `${BADGE_BASE} border-gray-200 bg-gray-50 font-medium text-gray-600`;
  };

  const renderBadge = (daysLeft: number) => {
    if (daysLeft < 0) {
      return (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
          {t("upcoming.overdueBy", {
            count: Math.abs(daysLeft),
            defaultValue: `Terlambat ${Math.abs(daysLeft)} hari`,
          })}
        </span>
      );
    }
    if (daysLeft === 0) {
      return (
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 shadow-xs animate-pulse">
          ⚡ {t("upcoming.today", "Hari ini")}
        </span>
      );
    }
    if (daysLeft === 1) {
      return (
        <span className={badgeClass(daysLeft)}>
          {t("upcoming.tomorrow", "Besok")}
        </span>
      );
    }
    return (
      <span className={badgeClass(daysLeft)}>
        {t("upcoming.daysRemaining", {
          count: daysLeft,
          defaultValue: `${daysLeft} hari lagi`,
        })}
      </span>
    );
  };

  return (
    <DashboardCard
      icon={CalendarClock}
      color={THEME.BSI_YELLOW}
      title={t("upcoming.title", "Upcoming Deadlines & Alerts")}
      className="h-full"
      contentClassName="pt-4 space-y-3"
    >
      {/* Urgent Projects Alert Banner */}
      {urgentProjects.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-left">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-red-700">
              {t("upcoming.urgent", "Urgent project alerts")}
            </p>
            <p className="text-[11px] text-red-600">
              {urgentProjects.length}{" "}
              {t("upcoming.urgentDescription", "project(s) require attention")}
            </p>
          </div>
        </div>
      )}

      {/* Deadlines List */}
      {deadlines.length === 0 && urgentProjects.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          {t("upcoming.empty", "No upcoming deadlines or urgent alerts.")}
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((item) => {
            const formattedDate = item.deadline.toLocaleDateString(locale, {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <button
                key={`${item.project.id}-${item.phaseName}`}
                onClick={() =>
                  navigate(
                    `/audit-trail?projectId=${encodeURIComponent(item.project.id)}`,
                  )
                }
                className="group flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-xs"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs border border-gray-100 group-hover:border-teal-200">
                  <CalendarClock
                    className={`h-4 w-4 ${
                      item.daysLeft < 0
                        ? "text-red-500"
                        : item.daysLeft <= 3
                        ? "text-amber-500"
                        : "text-[#38A79C]"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-gray-800 group-hover:text-teal-900">
                      {item.project.name}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                    <span className="font-semibold text-gray-700">
                      {item.phaseName}
                    </span>
                    <span>·</span>
                    <span>{formattedDate}</span>
                    {item.project.pic && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-gray-500">
                          <User className="h-2.5 w-2.5 text-gray-400" />
                          {item.project.pic}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0">{renderBadge(item.daysLeft)}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Link to Full Audit Trail */}
      <button
        onClick={() => navigate("/audit-trail")}
        className="flex w-full items-center justify-center gap-2 border-t border-gray-100 pt-3 text-xs font-bold text-[#38A79C] transition hover:text-[#267d76]"
      >
        {t("upcoming.auditTrail", "Open System Audit Trail")}{" "}
        <ArrowRight className="h-3.5 w-3.5" />{" "}
        <ExternalLink className="h-3 w-3" />
      </button>
    </DashboardCard>
  );
}
