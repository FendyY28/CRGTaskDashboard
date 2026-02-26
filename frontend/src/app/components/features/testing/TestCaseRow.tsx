import { memo } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { 
  CheckCircle2, XCircle, User,ThumbsUp, 
  ThumbsDown, StickyNote, Pencil, AlertOctagon, 
  RotateCcw, Clock, CalendarDays, ArchiveX
} from "lucide-react";
import { TEST_CASE_STATUS, THEME } from "../../../constants/projectConstants";

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', { 
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return DATE_FORMATTER.format(new Date(dateStr));
};

// Map Constants ke Styles (Menggunakan helper function untuk warna dinamis)
const getStyles = (status: string, isDel: boolean) => {
  if (isDel) {
    return { bg: "#F9FAFB", border: "#E5E7EB", text: "#9CA3AF", badgeBg: "#F3F4F6", badgeText: "#6B7280", icon: ArchiveX };
  }
  switch (status) {
    case TEST_CASE_STATUS.PASS:
      return { bg: THEME.TOSCA + "0D", border: THEME.TOSCA + "33", text: THEME.TOSCA, badgeBg: THEME.TOSCA + "1A", badgeText: THEME.TOSCA, icon: CheckCircle2 };
    case TEST_CASE_STATUS.FAIL:
      return { bg: "#FFF1F2", border: "#FECDD3", text: "#E11D48", badgeBg: "#FFE4E6", badgeText: "#E11D48", icon: XCircle };
    default:
      return { bg: "#FFFFFF", border: "#F3F4F6", text: "#9CA3AF", badgeBg: "transparent", badgeText: "#9CA3AF", icon: Clock };
  }
};

interface TestCaseRowProps {
  item: any;
  onAction: (type: string, item: any) => void;
}

export const TestCaseRow = memo(({ item, onAction }: TestCaseRowProps) => {
  const isDel = item.isDeleted;
  const s = getStyles(item.status, isDel);
  const Icon = s.icon;
  
  let displayUser = item.updatedBy || "System";
  let displayTime = item.updatedAt || item.createdAt;
  let actionLabel = item.updatedBy ? "Updated" : "Created";

  return (
    <div 
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 mb-3 group shadow-sm"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <div className="flex items-start gap-3 mb-3 sm:mb-0 w-full sm:w-auto overflow-hidden text-left">
        <div 
          className="mt-1 h-5 w-5 min-w-[20px] rounded-full flex items-center justify-center border-2"
          style={item.status === TEST_CASE_STATUS.PENDING && !isDel ? { borderColor: '#E5E7EB', color: '#D1D5DB' } : { borderColor: s.text, backgroundColor: isDel ? 'transparent' : s.text, color: isDel ? s.text : '#fff' }}
        >
          <Icon className="h-3 w-3" />
        </div>
        
        <div className="overflow-hidden w-full">
          <p className={`text-sm font-semibold truncate ${isDel ? 'text-gray-500 line-through decoration-gray-400' : (item.status === TEST_CASE_STATUS.PENDING ? 'text-gray-700' : 'text-gray-900')}`}>
            {item.title}
          </p>
          
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-gray-500 font-medium">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={isDel ? { backgroundColor: '#FEF2F2', color: '#DC2626' } : { backgroundColor: '#F3F4F6' }}>
                <User className="h-3 w-3 opacity-70" />
                <span className="truncate max-w-[100px]">{isDel ? (item.deletedBy || "Unknown") : displayUser}</span>
             </div>
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={isDel ? { backgroundColor: '#FEF2F2', color: '#DC2626' } : { backgroundColor: '#F3F4F6' }}>
                {isDel ? <ArchiveX className="h-3 w-3 opacity-70"/> : <CalendarDays className="h-3 w-3 opacity-70" />}
                <span>{isDel ? "Taken Out" : actionLabel} {formatDate(isDel ? (item.deletedAt || item.updatedAt) : displayTime)}</span>
             </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
             {isDel ? (
                <button onClick={() => onAction('view-takeout', item)} className="text-xs text-red-500 flex items-center gap-1.5 font-bold hover:underline"><StickyNote className="h-3 w-3" /> View Takeout Reason</button>
             ) : (
                <>
                  {item.status === TEST_CASE_STATUS.FAIL && item.defect ? (
                    <button onClick={() => onAction('view', item)} className="text-xs text-[#E11D48] flex items-center gap-1.5 font-bold hover:underline"><AlertOctagon className="h-3 w-3" /> View Defect</button>
                  ) : item.notes ? (
                    <button onClick={() => onAction('view', item)} className="text-xs flex items-center gap-1.5 font-medium hover:underline" style={{ color: THEME.BSI_YELLOW }}><StickyNote className="h-3 w-3" /> View Notes</button>
                  ) : null}
                  
                  {item.status === TEST_CASE_STATUS.PENDING && (
                    <button onClick={() => onAction('edit', item)} className="text-xs text-gray-400 flex items-center gap-1.5 font-medium hover:underline"><Pencil className="h-3 w-3" /> {item.notes ? "Edit Notes" : "Add Notes"}</button>
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
                <Button size="sm" variant="outline" onClick={() => onAction('pass', item)} className="h-8 rounded-lg hover:text-white transition-colors" style={{ borderColor: THEME.TOSCA, color: THEME.TOSCA }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.TOSCA} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Pass</Button>
                <Button size="sm" variant="outline" onClick={() => onAction('fail', item)} className="h-8 border-[#E11D48] text-[#E11D48] hover:bg-[#E11D48] hover:text-white rounded-lg transition-colors"><ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> Fail</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className="shadow-none px-3 capitalize font-bold rounded-md" style={{ backgroundColor: s.badgeBg, color: s.badgeText, border: `1px solid ${s.border}` }}>{item.status}</Badge>
                <Button variant="ghost" size="sm" onClick={() => onAction('reset', item)} className="h-7 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full px-2"><RotateCcw className="h-3 w-3 mr-1" /> Reset</Button>
              </div>
            )}
            <div className="h-4 w-[1px] bg-gray-200 mx-1"/>
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