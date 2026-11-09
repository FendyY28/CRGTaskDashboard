import { memo } from "react";
import { Button } from "../../ui/button";
import { 
  CheckCircle2, XCircle, User,ThumbsUp, 
  ThumbsDown, StickyNote, Pencil, AlertOctagon, 
  RotateCcw, Clock, CalendarDays, ArchiveX
} from "lucide-react";
import { TEST_CASE_STATUS, THEME } from "../../../constants/projectConstants";
import { ProtectAction } from "../../auth/ProtectAction"; 
import { useRBAC } from "../../../hooks/useRBAC"; 
import { useTranslation } from "react-i18next";

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', { 
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return DATE_FORMATTER.format(new Date(dateStr));
};

const getStyles = (status: string, isDel: boolean) => {
  if (isDel) {
    return { bg: "#F9FAFB", border: "#E5E7EB", text: "#9CA3AF", badgeBg: "#F3F4F6", badgeText: "#6B7280", icon: ArchiveX };
  }
  switch (status) {
    case TEST_CASE_STATUS.PASS:
      return { bg: "#E8F6F4", border: "#A8DCD6", text: "#1D7F76", badgeBg: "#D3EFEB", badgeText: "#157068", icon: CheckCircle2 };
    case TEST_CASE_STATUS.FAIL:
      return { bg: "#FFF1F2", border: "#FECDD3", text: "#E11D48", badgeBg: "#FFE4E6", badgeText: "#E11D48", icon: XCircle };
    default:
      return { bg: "#FFFFFF", border: "#F3F4F6", text: "#9CA3AF", badgeBg: "transparent", badgeText: "#9CA3AF", icon: Clock };
  }
};

interface TestCaseRowProps {
  item: any;
  onAction: (type: string, item: any) => void;
  /** Translation namespace: `testing` (UAT) or `sit` (SIT). */
  ns?: string;
}

export const TestCaseRow = memo(({ item, onAction, ns = 'testing' }: TestCaseRowProps) => {
  const isDel = item.isDeleted;
  const s = getStyles(item.status, isDel);
  const Icon = s.icon;
  const { t } = useTranslation();
  const canEdit = useRBAC().canEdit;
  
  let displayUser = item.updatedBy || t(`${ns}.row.system`);
  let displayTime = item.updatedAt || item.createdAt;
  let actionLabel = item.updatedBy ? t(`${ns}.row.updated`) : t(`${ns}.row.created`);

  // Helper untuk translasikan status yang dikirimkan dari Backend (misal "pass" -> "Lulus")
  const getStatusText = (status: string) => {
      return t(`${ns}.rowStatus.${status.toLowerCase()}`, { defaultValue: status });
  };

  return (
    <div 
      data-testid={`test-case-row-${item.id}`}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 mb-2 transition-all duration-200 group shadow-sm hover:shadow-md"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0 overflow-hidden text-left">
        <div 
          className="h-5 w-5 min-w-[20px] self-center rounded-full flex items-center justify-center border-2"
          style={item.status === TEST_CASE_STATUS.PENDING && !isDel ? { borderColor: '#E5E7EB', color: '#D1D5DB' } : { borderColor: s.text, backgroundColor: isDel ? 'transparent' : s.text, color: isDel ? s.text : '#fff' }}
        >
          <Icon className="h-3 w-3" />
        </div>
        
        <div className="overflow-hidden min-w-0 flex-1">
          <p className={`text-sm leading-snug font-semibold truncate ${isDel ? 'text-gray-500 line-through decoration-gray-400' : (item.status === TEST_CASE_STATUS.PENDING ? 'text-gray-700' : 'text-gray-900')}`}>
            {item.title}
          </p>
          
          <div className="flex flex-wrap items-center gap-2 mt-1 text-meta text-gray-600 font-medium">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={isDel ? { backgroundColor: '#FEF2F2', color: '#DC2626' } : { backgroundColor: '#F3F4F6' }}>
                <User className="h-3 w-3 opacity-70" />
                <span className="truncate max-w-[100px]">{isDel ? (item.deletedBy || t(`${ns}.row.unknown`)) : displayUser}</span>
             </div>
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={isDel ? { backgroundColor: '#FEF2F2', color: '#DC2626' } : { backgroundColor: '#F3F4F6' }}>
                {isDel ? <ArchiveX className="h-3 w-3 opacity-70"/> : <CalendarDays className="h-3 w-3 opacity-70" />}
                <span>{isDel ? t(`${ns}.row.takenOut`) : actionLabel} {formatDate(isDel ? (item.deletedAt || item.updatedAt) : displayTime)}</span>
             </div>
          </div>

          <div className="flex items-center gap-3 mt-1">
             {isDel ? (
                <button onClick={() => onAction('view-takeout', item)} className="text-xs text-red-500 flex items-center gap-1.5 font-bold hover:underline"><StickyNote className="h-3 w-3" /> {t(`${ns}.row.viewTakeoutReason`)}</button>
             ) : (
                <>
                  {item.status === TEST_CASE_STATUS.FAIL && item.defect ? (
                    <button onClick={() => onAction('view', item)} className="text-xs text-[#E11D48] flex items-center gap-1.5 font-bold hover:underline"><AlertOctagon className="h-3 w-3" /> {t(`${ns}.row.viewDefect`)}</button>
                  ) : item.status === TEST_CASE_STATUS.FAIL ? (
                    <span className="text-xs text-[#E11D48] flex items-center gap-1.5 font-bold"><AlertOctagon className="h-3 w-3" /> {t(`${ns}.row.defectMissing`)}</span>
                  ) : item.notes ? (
                    <button onClick={() => onAction('view', item)} className="text-xs flex items-center gap-1.5 font-medium hover:underline" style={{ color: THEME.BSI_YELLOW }}><StickyNote className="h-3 w-3" /> {t(`${ns}.row.viewNotes`)}</button>
                  ) : null}
                  
                  {item.status === TEST_CASE_STATUS.PENDING && (
                    <ProtectAction>
                      <button onClick={() => onAction('edit', item)} className="text-xs text-gray-400 flex items-center gap-1.5 font-medium hover:underline"><Pencil className="h-3 w-3" /> {item.notes ? t(`${ns}.row.editNotes`) : t(`${ns}.row.addNotes`)}</button>
                    </ProtectAction>
                  )}
                </>
             )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
        {!isDel ? (
          <>
            {item.status === TEST_CASE_STATUS.PENDING ? (
              <div className="flex gap-1.5">
                <ProtectAction>
                  <Button size="sm" variant="outline" onClick={() => onAction('pass', item)} className="h-8 rounded-lg hover:text-white transition-colors" style={{ borderColor: THEME.TOSCA, color: THEME.TOSCA }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.TOSCA} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> {t(`${ns}.actions.pass`)}</Button>
                </ProtectAction>
                <ProtectAction>
                  <Button size="sm" variant="outline" onClick={() => onAction('fail', item)} className="h-8 border-[#E11D48] text-[#E11D48] hover:bg-[#E11D48] hover:text-white rounded-lg transition-colors"><ThumbsDown className="h-3.5 w-3.5 mr-1.5" /> {t(`${ns}.actions.fail`)}</Button>
                </ProtectAction>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-bold capitalize"
                  style={{ backgroundColor: s.badgeBg, color: s.badgeText, border: `1px solid ${s.border}` }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {getStatusText(item.status)}
                </span>

                <ProtectAction>
                  <Button variant="ghost" size="sm" onClick={() => onAction('reset', item)} className="h-7 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full px-2"><RotateCcw className="h-3 w-3 mr-1" /> {t(`${ns}.actions.reset`)}</Button>
                </ProtectAction>
              </div>
            )}
            
            <ProtectAction fallback={canEdit ? undefined : <div className="w-8" />}>
              <div className="flex items-center">
                <div className="h-4 w-[1px] bg-gray-200 mx-1"/>
                <Button variant="ghost" size="icon" onClick={() => onAction('takeout', item)} title={t(`${ns}.row.takeoutTooltip`)} className="h-8 w-8 text-gray-400 hover:text-[#E11D48] hover:bg-red-50 rounded-full"><ArchiveX className="h-4 w-4" /></Button>
              </div>
            </ProtectAction>
          </>
        ) : (
          <span className="text-label font-bold uppercase text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 tracking-wider flex items-center gap-1">
            <ArchiveX className="h-3 w-3" /> {t(`${ns}.row.takeoutBadge`)}
          </span>
        )}
      </div>
    </div>
  );
});
TestCaseRow.displayName = "TestCaseRow";