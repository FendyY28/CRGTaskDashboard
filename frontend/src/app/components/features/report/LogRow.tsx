import { memo } from "react";
import { AlertTriangle, Lightbulb, ChevronRight, User, Calendar } from "lucide-react";
import { StatusBadge } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import type { ProjectIssue, ImprovementNote } from "../../../types";

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

const formatDate = (dateString?: string) => {
  if (!dateString) return "Unknown Date";
  return DATE_FORMATTER.format(new Date(dateString));
};

type LogItem = ProjectIssue | ImprovementNote;

interface LogRowProps {
  item: LogItem;
  onClick: (item: LogItem) => void;
}

export const LogRow = memo(({ item, onClick }: LogRowProps) => {
  const isImp = item.type === 'improvement';
  
  const reporterName = isImp ? (item as ImprovementNote).reviewer : (item as ProjectIssue).reportedBy;
  const dateReported = isImp ? (item as ImprovementNote).createdDate : (item as ProjectIssue).reportedDate;
  
  // Ambil title asli dari data, jangan di-hardcode
  const title = (item as any).title || (isImp ? "Improvement Plan" : "Unknown Issue");
  
  const displayId = isImp ? (item as ImprovementNote).noteId : (item as ProjectIssue).issueId;
  const description = isImp ? (item as ImprovementNote).recommendations : (item as ProjectIssue).description;

  const getSidebarColor = () => {
    if (isImp) return THEME.TOSCA;
    if (item.priority === 'critical') return "#7C2D12"; 
    if (item.priority === 'high') return "#E11D48";
    return THEME.BSI_LIGHT_GRAY;
  };

  return (
    <div 
      onClick={() => onClick(item)} 
      className="p-4 rounded-xl border bg-white shadow-sm cursor-pointer transition-all duration-200 group hover:shadow-md border-l-4 hover:border-l-[6px]"
      style={{ borderLeftColor: getSidebarColor(), borderColor: THEME.BSI_LIGHT_GRAY + '40' }} 
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 overflow-hidden w-full">
          <div 
            className="mt-1 h-9 w-9 min-w-[36px] rounded-full flex items-center justify-center border-2 transition-colors"
            style={isImp 
              ? { borderColor: THEME.TOSCA + '40', backgroundColor: THEME.TOSCA + '15', color: THEME.TOSCA }
              : { borderColor: THEME.BSI_LIGHT_GRAY + '40', backgroundColor: THEME.BSI_LIGHT_GRAY + '15', color: THEME.BSI_GREY }
            }
          >
            {isImp ? <Lightbulb className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <div className="overflow-hidden w-full text-left">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold truncate uppercase" style={{ color: THEME.BSI_DARK_GRAY }}>{title}</h4>
                  {item.type === 'issue' && <StatusBadge value={item.priority} />}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold" style={{ color: THEME.BSI_GREY }}>{displayId}</span>
                  {/* Nama project dihapus dari sini karena sudah jelas di header/sidebar */}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" style={{ color: THEME.BSI_LIGHT_GRAY }} />
            </div>
            <p className="text-xs line-clamp-1 mt-2 pr-8 italic" style={{ color: THEME.BSI_GREY }}>{description}</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '30' }}>
              <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: THEME.BSI_GREY }}><User className="h-3 w-3" /> {reporterName}</span>
              <span className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: THEME.BSI_GREY }}><Calendar className="h-3 w-3" /> {formatDate(dateReported)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
LogRow.displayName = "LogRow";