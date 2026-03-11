import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ArchiveX, AlertOctagon, StickyNote } from "lucide-react";
import { TEST_CASE_STATUS, TEST_CASE_TYPE, THEME } from "../../constants/projectConstants";
import { useTestCases } from "../../hooks/useTestCases";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface TestingModalsProps {
  modal: { type: string | null; item?: any };
  selProject: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function TestingModals({ modal, selProject, onClose, onSuccess }: TestingModalsProps) {
  const { addTestCase, updateTestCase, deleteTestCase } = useTestCases();
  const [isBusy, setIsBusy] = useState(false);
  const [form, setForm] = useState({ title: "", type: TEST_CASE_TYPE.POSITIVE as string, notes: "", description: "", severity: "Low", takeoutReason: "" });
  
  const { t } = useTranslation();

  useEffect(() => {
    if (modal.type === 'pass') setForm(f => ({ ...f, notes: "" }));
    else if (modal.type === 'fail') setForm(f => ({ ...f, description: "", severity: "Low" }));
    else if (modal.type === 'edit') setForm(f => ({ ...f, notes: modal.item?.notes || "" }));
    else if (modal.type === 'takeout') setForm(f => ({ ...f, takeoutReason: "" }));
    else if (modal.type === 'add') setForm({ title: "", type: TEST_CASE_TYPE.POSITIVE as string, notes: "", description: "", severity: "Low", takeoutReason: "" });
  }, [modal]);

  const handleAction = {
    add: async () => {
      setIsBusy(true);
      toast.promise(
        addTestCase({ ...form, projectId: selProject.id }),
        { 
          loading: t('testing.modals.toast.adding'), 
          success: () => { 
            onClose(); 
            setIsBusy(false); 
            onSuccess(); 
            return t('testing.modals.toast.addSuccess'); 
          }, 
          error: () => { setIsBusy(false); return t('testing.modals.toast.addFail'); } 
        }
      );
    },
    update: async (status: string) => {
      setIsBusy(true);
      const isFail = status === TEST_CASE_STATUS.FAIL;
      toast.promise(
        updateTestCase(modal.item.id, { 
          status, 
          notes: form.notes, 
          defect: isFail ? { description: form.description, severity: form.severity } : undefined 
        }, selProject.id),
        { 
          loading: t('testing.modals.toast.updating'), 
          success: () => { 
            onClose(); 
            setIsBusy(false); 
            onSuccess(); 
            return isFail ? t('testing.modals.toast.defectSuccess') : t('testing.modals.toast.updateSuccess'); 
          }, 
          error: () => { setIsBusy(false); return t('testing.modals.toast.updateFail'); } 
        }
      );
    },
    takeout: async () => {
      if (!form.takeoutReason.trim()) { toast.error(t('testing.modals.toast.takeoutReasonReq')); return; }
      setIsBusy(true);
      toast.promise(
        updateTestCase(modal.item.id, { 
             status: modal.item.status, 
             takeoutReason: form.takeoutReason, 
             isDeleted: true 
        }, selProject.id).then(() => deleteTestCase(modal.item.id, selProject.id)), 
        { 
          loading: t('testing.modals.toast.takeoutProcessing'), 
          success: () => { 
            onClose(); 
            setIsBusy(false); 
            onSuccess(); 
            return t('testing.modals.toast.takeoutSuccess'); 
          }, 
          error: () => { setIsBusy(false); return t('testing.modals.toast.takeoutFail'); } 
        }
      );
    }
  };

  return (
    <>
      {/* General Modal (Add, Edit, Pass, Fail) */}
      <Dialog open={['add', 'edit', 'pass', 'fail'].includes(modal.type || '')} onOpenChange={onClose}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[500px] text-left">
          <DialogHeader>
            <DialogTitle style={{ color: modal.type === 'fail' ? "#E11D48" : THEME.TOSCA }}>
              {modal.type === 'add' && t('testing.modals.addTitle')}
              {modal.type === 'edit' && t('testing.modals.editTitle')}
              {modal.type === 'pass' && t('testing.modals.passTitle')}
              {modal.type === 'fail' && t('testing.modals.failTitle')}
            </DialogTitle>
            <DialogDescription className="font-medium">{modal.item?.title || t('testing.modals.projectPrefix') + selProject?.name}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {modal.type === 'add' && (
              <>
                <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">{t('testing.modals.labels.title')}</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="rounded-xl border-gray-100 h-11" style={{ outlineColor: THEME.TOSCA }} /></div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-xs font-bold uppercase text-gray-400">{t('testing.modals.labels.type')}</Label>
                  <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                    <SelectTrigger className="rounded-xl border-gray-100 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value={TEST_CASE_TYPE.POSITIVE}>{t('testing.modals.labels.positive')}</SelectItem>
                      <SelectItem value={TEST_CASE_TYPE.NEGATIVE}>{t('testing.modals.labels.negative')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {(modal.type === 'add' || modal.type === 'edit' || modal.type === 'pass') && (
              <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">{t('testing.modals.labels.notes')}</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="rounded-xl border-gray-100 min-h-[120px]" placeholder={t('testing.modals.placeholders.notes')} /></div>
            )}

            {modal.type === 'fail' && (
              <>
                <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">{t('testing.modals.labels.severity')}</Label><Select value={form.severity} onValueChange={v => setForm({...form, severity: v})}><SelectTrigger className="rounded-xl border-red-100 h-11 focus:ring-[#E11D48]"><SelectValue /></SelectTrigger><SelectContent className="bg-white">{["Low","Medium","High","Critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5 text-left"><Label className="text-xs font-bold uppercase text-gray-400">{t('testing.modals.labels.description')}</Label><Textarea placeholder={t('testing.modals.placeholders.description')} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="rounded-xl border-red-100 focus-visible:ring-[#E11D48] min-h-[120px]" /></div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={onClose} className="rounded-xl h-11 font-bold">{t('testing.modals.buttons.cancel')}</Button>
            <Button 
              onClick={() => modal.type === 'add' ? handleAction.add() : handleAction.update(modal.type === 'fail' ? TEST_CASE_STATUS.FAIL : modal.type === 'pass' ? TEST_CASE_STATUS.PASS : modal.item.status)} 
              disabled={isBusy || (modal.type === 'add' && !form.title)}
              className="rounded-xl h-11 px-8 font-bold text-white transition-all"
              style={{ backgroundColor: modal.type === 'fail' ? '#E11D48' : THEME.TOSCA }}
            >
              {t('testing.modals.buttons.confirmChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Takeout Modal */}
      <Dialog open={modal.type === 'takeout'} onOpenChange={onClose}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[400px] text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-red-50 rounded-full text-red-600 ring-4 ring-red-50/50"><ArchiveX className="h-8 w-8" /></div>
            <div className="space-y-1"><h3 className="text-lg font-bold text-gray-900">{t('testing.modals.takeoutTitle')}</h3><p className="text-sm text-gray-500">{t('testing.modals.takeoutDesc')}</p></div>
          </div>
          
          <div className="mt-4 text-left space-y-1.5">
             <Label className="text-xs font-bold uppercase text-gray-400">{t('testing.modals.labels.reason')}</Label>
             <Textarea value={form.takeoutReason} onChange={e => setForm({...form, takeoutReason: e.target.value})} className="rounded-xl border-red-100 focus-visible:ring-[#E11D48] min-h-[100px]" placeholder={t('testing.modals.placeholders.reason')} />
          </div>

          <DialogFooter className="mt-6 flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11 font-bold">{t('testing.modals.buttons.cancel')}</Button>
            <Button onClick={handleAction.takeout} disabled={!form.takeoutReason.trim() || isBusy} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white h-11 font-bold">{t('testing.modals.buttons.confirmTakeout')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={modal.type === 'view' || modal.type === 'view-takeout'} onOpenChange={onClose}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-2xl sm:max-w-[500px] text-left">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              {modal.type === 'view-takeout' ? <ArchiveX className="h-5 w-5 text-red-500"/> : modal.item?.status === TEST_CASE_STATUS.FAIL ? <AlertOctagon className="h-5 w-5 text-[#E11D48]"/> : <StickyNote className="h-5 w-5" style={{ color: THEME.BSI_YELLOW }}/>}
              <DialogTitle>
                {modal.type === 'view-takeout' ? t('testing.modals.viewTakeoutTitle') : modal.item?.status === TEST_CASE_STATUS.FAIL ? t('testing.modals.viewDefectTitle') : t('testing.modals.viewNotesTitle')}
              </DialogTitle>
            </div>
            <DialogDescription className="font-bold text-gray-800 text-sm">{modal.item?.title}</DialogDescription>
          </DialogHeader>
          <div className="p-5 bg-gray-50 rounded-2xl text-sm text-gray-600 border border-gray-100 leading-relaxed shadow-inner">
            {modal.type === 'view-takeout' ? (
               <p className="whitespace-pre-wrap font-medium text-red-600">{modal.item?.takeoutReason || t('testing.modals.noReason')}</p>
            ) : modal.item?.status === TEST_CASE_STATUS.FAIL && modal.item?.defect ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">{t('testing.modals.labels.severity')}:</span> <Badge className="bg-red-50 text-red-700 border-red-100 shadow-none text-[10px] font-black">{modal.item.defect.severity}</Badge></div>
                <div className="space-y-1"><span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">{t('testing.modals.labels.issueSummary')}</span><p className="font-medium text-gray-700">{modal.item.defect.description}</p></div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap font-medium">{modal.item?.notes || t('testing.modals.noNotes')}</p>
            )}
          </div>
          <DialogFooter><Button onClick={onClose} className="text-white font-bold rounded-xl px-8 h-11" style={{ backgroundColor: THEME.TOSCA }}>{t('testing.modals.buttons.gotIt')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}