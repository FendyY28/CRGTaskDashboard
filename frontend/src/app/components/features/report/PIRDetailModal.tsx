import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Lightbulb, User, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { StatusBadge, DashboardSelect } from "../../dashboard/index";
import { THEME } from "../../../constants/projectConstants";
import { capitalize } from "../../../../lib/utils";
import { usePIR } from "../../../hooks/usePIR";
import { toast } from "sonner";
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

interface PIRDetailModalProps {
  selectedItem: LogItem | null;
  onClose: () => void;
  onActionComplete: () => void; // Konsisten pakai nama ini
  onLocalUpdate: (status: string) => void;
}

// 🔥 PERBAIKAN DI SINI: Destructure onActionComplete, bukan onItemUpdated
export function PIRDetailModal({ selectedItem, onClose, onActionComplete, onLocalUpdate }: PIRDetailModalProps) {
  const { updateIssueStatus, deleteIssue } = usePIR();
  const [isBusy, setIsBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleClose = () => {
    setDeleteConfirm(false);
    onClose();
  };

  const onUpdateStatus = async (id: number | undefined, status: string) => {
    if (!id) return;
    setIsBusy(true);
    toast.promise(updateIssueStatus(id, status), {
      loading: 'Updating status...',
      success: () => {
        setIsBusy(false);
        onLocalUpdate(status);
        onActionComplete(); // 🔥 Panggil refresh ke Induk
        return `Status updated to ${status.toUpperCase()}`;
      },
      error: () => {
        setIsBusy(false);
        return 'Status update failed.';
      }
    });
  };

  const onDelete = async (id: number | undefined) => {
    if (!id) return;
    setIsBusy(true);
    toast.promise(deleteIssue(id), {
      loading: 'Removing issue...',
      success: () => {
        setIsBusy(false);
        handleClose();
        onActionComplete(); // 🔥 Panggil refresh ke Induk setelah hapus
        return 'Issue deleted successfully.';
      },
      error: () => {
        setIsBusy(false);
        return 'Failed to delete issue.';
      }
    });
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
                <DialogDescription className="text-xs" style={{ color: THEME.BSI_GREY }}>Project: {selectedItem.projectName}</DialogDescription>
              </div>
              {selectedItem.type === 'improvement' ? <Lightbulb className="h-5 w-5" style={{ color: THEME.TOSCA }} /> : <StatusBadge value={'status' in selectedItem ? selectedItem.status : ''} />}
            </div>
            <div className="p-6 space-y-6 text-left">
              <div className="flex items-center gap-6 p-4 rounded-xl border text-sm" style={{ backgroundColor: THEME.BSI_LIGHT_GRAY + '15', borderColor: THEME.BSI_LIGHT_GRAY + '30' }}>
                <div className="space-y-1"><span className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Reporter</span><p className="font-semibold flex items-center gap-1.5" style={{ color: THEME.BSI_DARK_GRAY }}><User className="h-4 w-4" style={{ color: THEME.BSI_LIGHT_GRAY }}/> {selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).reviewer : (selectedItem as ProjectIssue).reportedBy}</p></div>
                <div className="space-y-1"><span className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Submitted</span><p className="font-medium flex items-center gap-1.5" style={{ color: THEME.BSI_DARK_GRAY }}><Calendar className="h-4 w-4" style={{ color: THEME.BSI_LIGHT_GRAY }}/> {formatDate(selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).createdDate : (selectedItem as ProjectIssue).reportedDate)}</p></div>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Description</Label><div className="p-4 rounded-xl text-sm border shadow-inner" style={{ backgroundColor: THEME.BSI_WHITE, borderColor: THEME.BSI_LIGHT_GRAY + '40', color: THEME.BSI_DARK_GRAY }}>{selectedItem.type === 'improvement' ? (selectedItem as ImprovementNote).recommendations : (selectedItem as ProjectIssue).description}</div></div>
              
              {selectedItem.type === 'issue' && (
                (selectedItem as ProjectIssue).status === 'resolved' ? (
                    <div className="p-4 rounded-xl font-bold flex items-center gap-3" style={{ backgroundColor: THEME.BSI_GREEN + '20', color: THEME.BSI_GREEN }}>
                        <CheckCircle2 className="h-5 w-5" /> Issue Resolved.
                    </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: THEME.BSI_LIGHT_GRAY + '30' }}>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Status</Label>
                        <DashboardSelect value={(selectedItem as ProjectIssue).status} onChange={(e: any) => onUpdateStatus(selectedItem.id, e.target.value)} disabled={isBusy}>
                            {['open', 'in-progress', 'resolved'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                        </DashboardSelect>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase" style={{ color: THEME.BSI_GREY }}>Action</Label>
                        {!deleteConfirm ? (
                            <Button variant="outline" onClick={() => setDeleteConfirm(true)} className="w-full h-10 text-xs text-red-600 border-red-200">Delete</Button>
                        ) : (
                            <div className="flex gap-1">
                                <Button variant="ghost" onClick={() => setDeleteConfirm(false)} className="flex-1 text-[10px]">No</Button>
                                <Button variant="destructive" onClick={() => onDelete(selectedItem.id)} className="flex-1 text-[10px]">
                                    {isBusy ? <Loader2 className="animate-spin h-3 w-3"/> : 'Yes, Delete'}
                                </Button>
                            </div>
                        )}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}