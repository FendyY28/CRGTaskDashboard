import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Lightbulb, User, Calendar, CheckCircle2, Loader2, AlertTriangle, Clock } from "lucide-react";
import { DashboardSelect } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import { capitalize } from "../../../../lib/utils";
import { usePIR } from "../../../hooks/usePIR";
import { toast } from "sonner";
import type { ProjectIssue, ImprovementNote } from "../../../types";

import { ProtectAction } from "../../../components/auth/ProtectAction";

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

const formatDate = (dateString?: string) => {
  if (!dateString) return "Unknown Date";
  return DATE_FORMATTER.format(new Date(dateString));
};

const normalizeStr = (str?: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[-_]/g, ' ').trim();
};

type LogItem = ProjectIssue | ImprovementNote;

interface PIRDetailModalProps {
  selectedItem: LogItem | null;
  onClose: () => void;
  onActionComplete: () => void; 
  onLocalUpdate: (status: string) => void;
}

export function PIRDetailModal({ selectedItem, onClose, onActionComplete, onLocalUpdate }: PIRDetailModalProps) {
  const { updateIssueStatus, deleteIssue } = usePIR();
  const [isBusy, setIsBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleClose = () => {
    setDeleteConfirm(false);
    onClose();
  };

  const getTargetId = () => {
      if (!selectedItem) return undefined;
      return (selectedItem as any).id || (selectedItem as any).issueId;
  };

  const onUpdateStatus = async (status: string) => {
    const id = getTargetId();
    if (!id) return;
    setIsBusy(true);
    toast.promise(updateIssueStatus(id, status), {
      loading: 'Updating status...',
      success: () => {
        setIsBusy(false);
        onLocalUpdate(status);
        onActionComplete(); 
        return `Status updated to ${status.toUpperCase()}`;
      },
      error: () => {
        setIsBusy(false);
        return 'Status update failed.';
      }
    });
  };

  const onDelete = async () => {
    const id = getTargetId();
    if (!id) return;
    setIsBusy(true);
    toast.promise(deleteIssue(id), {
      loading: 'Removing issue...',
      success: () => {
        setIsBusy(false);
        handleClose();
        onActionComplete(); 
        return 'Issue deleted successfully.';
      },
      error: () => {
        setIsBusy(false);
        return 'Failed to delete issue.';
      }
    });
  };

  // 🔥 CUSTOM BADGE: Ditulis ulang agar 100% bebas error TypeScript
  const renderStatusBadge = () => {
    if (!selectedItem || selectedItem.type === 'improvement') return null;
    
    const status = normalizeStr((selectedItem as ProjectIssue).status);
    
    if (status === 'resolved') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase shadow-sm" style={{ backgroundColor: THEME.BSI_GREEN + '1A', color: THEME.BSI_GREEN, borderColor: THEME.BSI_GREEN + '40' }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> RESOLVED
        </div>
      );
    } 
    
    if (status === 'in progress') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase shadow-sm" style={{ backgroundColor: '#0284C71A', color: '#0284C7', borderColor: '#0284C740' }}>
            <Clock className="h-3.5 w-3.5" /> IN PROGRESS
        </div>
      );
    } 
    
    if (status === 'open') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase shadow-sm" style={{ backgroundColor: THEME.BSI_YELLOW + '1A', color: THEME.BSI_YELLOW, borderColor: THEME.BSI_YELLOW + '40' }}>
            <AlertTriangle className="h-3.5 w-3.5" /> OPEN
        </div>
      );
    }

    // Default status (Unknown)
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase shadow-sm" style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '1A', color: THEME.BSI_GREY, borderColor: THEME.BSI_LIGHT_GRAY + '40' }}>
            {status.toUpperCase() || 'UNKNOWN'}
        </div>
    );
  };

  return (
    <Dialog open={!!selectedItem} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[500px] p-0 overflow-hidden">
        {selectedItem && (
          <>
            <div className="p-6 border-b border-gray-100 flex justify-between items-start" style={{ backgroundColor: selectedItem.type === 'improvement' ? THEME.TOSCA + '10' : THEME.BSI_WHITE }}>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] font-bold" style={{ color: selectedItem.type === 'improvement' ? THEME.TOSCA : THEME.BSI_GREY, borderColor: selectedItem.type === 'improvement' ? THEME.TOSCA : THEME.BSI_LIGHT_GRAY }}>{selectedItem.type.toUpperCase()}</Badge>
                  <span className="text-xs font-mono" style={{ color: THEME.BSI_LIGHT_GRAY }}>{'issueId' in selectedItem ? selectedItem.issueId : selectedItem.noteId}</span>
                </div>
                <DialogTitle className="text-lg font-bold uppercase" style={{ color: THEME.BSI_DARK_GRAY }}>{('title' in selectedItem ? selectedItem.title : "Improvement Plan")}</DialogTitle>
                <DialogDescription className="text-xs mt-1" style={{ color: THEME.BSI_GREY }}>Project: <span className="font-semibold">{selectedItem.projectName}</span></DialogDescription>
              </div>
              
              {/* 🔥 Tampilkan Custom Badge yang warnanya senada dengan KPI Card */}
              {selectedItem.type === 'improvement' ? <Lightbulb className="h-6 w-6 mt-1" style={{ color: THEME.TOSCA }} /> : renderStatusBadge()}
            </div>
            
            <div className="p-6 space-y-6 text-left">
              <div className="flex items-center gap-6 p-4 rounded-xl border text-sm" style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '15', borderColor: THEME.BSI_LIGHT_GRAY + '30' }}>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Reporter</span>
                  <p className="font-semibold flex items-center gap-1.5" style={{ color: THEME.BSI_DARK_GRAY }}>
                    <User className="h-4 w-4" style={{ color: THEME.BSI_LIGHT_GRAY }}/> 
                    {selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).reviewer : (selectedItem as ProjectIssue).reportedBy}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Submitted</span>
                  <p className="font-medium flex items-center gap-1.5" style={{ color: THEME.BSI_DARK_GRAY }}>
                    <Calendar className="h-4 w-4" style={{ color: THEME.BSI_LIGHT_GRAY }}/> 
                    {formatDate(selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).createdDate : (selectedItem as ProjectIssue).reportedDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase ml-1" style={{ color: THEME.BSI_GREY }}>Description</Label>
                <div className="p-4 rounded-xl text-sm border shadow-inner leading-relaxed" style={{ backgroundColor: THEME.BSI_WHITE, borderColor: THEME.BSI_LIGHT_GRAY + '40', color: THEME.BSI_DARK_GRAY }}>
                  {selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).recommendations : (selectedItem as ProjectIssue).description}
                </div>
              </div>
              
              {selectedItem.type === 'issue' && (
                (selectedItem as ProjectIssue).status.toLowerCase() === 'resolved' ? (
                    <div className="p-4 rounded-xl font-bold flex items-center gap-3 border shadow-sm" style={{ backgroundColor: THEME.BSI_GREEN + '10', borderColor: THEME.BSI_GREEN + '30', color: THEME.BSI_GREEN }}>
                        <CheckCircle2 className="h-5 w-5" /> Issue Resolved.
                    </div>
                ) : (
                  <ProtectAction>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '30' }}>
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase ml-1" style={{ color: THEME.BSI_GREY }}>Update Status</Label>
                          <DashboardSelect value={(selectedItem as ProjectIssue).status} onChange={(e: any) => onUpdateStatus(e.target.value)} disabled={isBusy}>
                              {['open', 'in-progress', 'resolved'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                          </DashboardSelect>
                      </div>
                      <div className="space-y-2 flex flex-col justify-end">
                          <Label className="text-[10px] font-bold uppercase ml-1" style={{ color: THEME.BSI_GREY }}>Danger Zone</Label>
                          
                          {!deleteConfirm ? (
                              <Button variant="outline" onClick={() => setDeleteConfirm(true)} disabled={isBusy} className="w-full h-10 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors">
                                Delete Issue
                              </Button>
                          ) : (
                              <div className="flex items-center gap-2 w-full">
                                  <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={isBusy} className="flex-1 h-10 px-0 text-[11px] font-bold text-gray-600 border-gray-200 hover:bg-gray-50">
                                    Cancel
                                  </Button>
                                  <Button variant="destructive" onClick={onDelete} disabled={isBusy} className="flex-1 h-10 px-0 text-[11px] font-bold border-none bg-red-600 hover:bg-red-700 text-white shadow-md">
                                      {isBusy ? <Loader2 className="animate-spin h-3 w-3 mx-auto"/> : 'Confirm'}
                                  </Button>
                              </div>
                          )}
                      </div>
                    </div>
                  </ProtectAction>
                )
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}