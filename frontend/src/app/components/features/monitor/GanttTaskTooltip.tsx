import type { Task } from "gantt-task-react";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "../../ui/badge";
import { useTranslation } from "react-i18next";
import { STATUS_COLORS, STATUS_ICONS, type StatusKey } from "./ganttData";
import { fmtDate } from "../../../../lib/utils";

interface GanttTaskTooltipProps {
  task: Task;
  fontSize?: string;
  fontFamily?: string;
}

/** Tooltip shown when hovering a Gantt bar. */
export function GanttTaskTooltip({
  task,
  fontSize,
  fontFamily,
}: GanttTaskTooltipProps) {
  const { t } = useTranslation();

  const custom = task as Task & {
    custom_phase?: string;
    custom_status_key?: StatusKey;
    custom_status?: string;
    custom_is_overdue?: boolean;
  };

  const phaseName = custom.custom_phase || task.name;
  const statusKey: StatusKey = custom.custom_status_key || "ON_TRACK";
  const statusConfig = STATUS_COLORS[statusKey] || STATUS_COLORS.ON_TRACK;
  const rawStatus = custom.custom_status ? custom.custom_status.toLowerCase() : "";
  const isOverdue = custom.custom_is_overdue;

  let statusText = t("gantt.tooltip.onTrack");
  if (statusKey === "OVERDUE" || isOverdue || rawStatus === "overdue") {
    statusText = t("gantt.tooltip.overdue");
  } else if (statusKey === "AT_RISK" || rawStatus === "at-risk") {
    statusText = t("gantt.tooltip.atRisk");
  } else if (task.progress === 100 || rawStatus === "completed") {
    statusText = t("gantt.tooltip.completed");
  } else if (
    statusKey === "NOT_STARTED" ||
    (task.progress === 0 && rawStatus === "pending")
  ) {
    statusText = t("gantt.tooltip.notStarted");
  }

  const statusIcon = STATUS_ICONS[statusKey] || STATUS_ICONS.ON_TRACK;
  const StatusIcon = statusIcon.icon === "alert" ? AlertTriangle : CheckCircle2;

  return (
    <div
      style={{
        background: "#fff",
        padding: "14px 16px",
        borderRadius: "12px",
        boxShadow:
          "0 14px 28px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)",
        fontSize,
        fontFamily,
        border: `1px solid ${statusConfig.border}`,
        minWidth: "220px",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: statusConfig.solid }}
          />
          <b className="text-gray-900 text-sm font-bold">{phaseName}</b>
        </div>
        <Badge
          variant="outline"
          className="text-label font-bold px-2 py-0.5"
          style={{
            color: statusConfig.solid,
            borderColor: statusConfig.border,
            backgroundColor: statusConfig.bg,
          }}
        >
          {task.progress}%
        </Badge>
      </div>

      <div className="text-meta text-gray-500 mb-2.5 pb-2 border-b border-gray-100 flex items-center gap-1.5 font-mono">
        <Clock className="h-3 w-3 text-gray-400 shrink-0" />
        <span>
          {fmtDate(task.start.toISOString())} — {fmtDate(task.end.toISOString())}
        </span>
      </div>

      <div className="flex items-center justify-between text-label font-bold">
        <span className="text-gray-400 uppercase tracking-wider">
          {t("gantt.tooltip.status")}:
        </span>
        <span
          className="px-2 py-0.5 rounded-md flex items-center gap-1"
          style={{
            color: statusConfig.text,
            backgroundColor: statusConfig.bg,
          }}
        >
          <StatusIcon className="h-3 w-3" style={{ color: statusIcon.color }} />
          {statusText}
        </span>
      </div>
    </div>
  );
}
