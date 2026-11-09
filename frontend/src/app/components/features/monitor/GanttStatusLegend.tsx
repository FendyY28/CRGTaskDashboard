import { useTranslation } from "react-i18next";
import { STATUS_COLORS } from "./ganttData";

interface LegendItem {
  color: string;
  border: string;
  textColor: string;
  labelKey: string;
  fallback: string;
  dashed?: boolean;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    color: STATUS_COLORS.ON_TRACK.solid,
    border: STATUS_COLORS.ON_TRACK.border,
    textColor: STATUS_COLORS.ON_TRACK.text,
    labelKey: "gantt.tooltip.onTrack",
    fallback: "On Track",
  },
  {
    color: STATUS_COLORS.AT_RISK.solid,
    border: STATUS_COLORS.AT_RISK.border,
    textColor: STATUS_COLORS.AT_RISK.text,
    labelKey: "gantt.tooltip.atRisk",
    fallback: "At Risk",
  },
  {
    color: STATUS_COLORS.OVERDUE.solid,
    border: STATUS_COLORS.OVERDUE.border,
    textColor: STATUS_COLORS.OVERDUE.text,
    labelKey: "gantt.tooltip.overdue",
    fallback: "Overdue",
  },
  {
    color: "transparent",
    border: "#E5E7EB",
    textColor: "#6B7280",
    labelKey: "gantt.tooltip.notStarted",
    fallback: "Not Started",
    dashed: true,
  },
];

/** Status colour legend shown under the Gantt chart. */
export function GanttStatusLegend() {
  const { t } = useTranslation();

  return (
    <div className="border-t border-gray-100 p-4 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-meta font-bold text-gray-500 uppercase tracking-wider">
          {t("gantt.legend.statusTitle", "Kondisi Fase:")}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-gray-700">
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.labelKey}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white shadow-2xs"
            style={{ border: `1px solid ${item.border}` }}
          >
            {item.dashed ? (
              <div className="w-3 h-3 rounded-sm border border-dashed border-gray-400 bg-transparent" />
            ) : (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span style={{ color: item.textColor }}>
              {t(item.labelKey, item.fallback)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
