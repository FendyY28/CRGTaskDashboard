import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Rocket, AlertCircle, RotateCcw, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NextCycleModal({ open, onOpenChange, project, isLoading, onConfirm }: any) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl p-6 border-none shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-[#36A39D]/10 text-[#36A39D] rounded-full flex items-center justify-center animate-bounce">
            <Rocket className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-gray-900">{t('editProject.nextCycleModal.title')}</DialogTitle>
            <DialogDescription className="text-gray-500 px-2">
              {t('editProject.nextCycleModal.desc1')} <b>{t('editProject.nextCycleModal.cycleText', { cycle: project?.cycle || 1 })}</b> {t('editProject.nextCycleModal.desc2')} <b>{t('editProject.nextCycleModal.cycleText', { cycle: (project?.cycle || 1) + 1 })}</b> {t('editProject.nextCycleModal.desc3')}
            </DialogDescription>
          </div>
        </div>
        <div className="bg-[#F9AD3C]/10 border border-[#F9AD3C]/20 p-4 rounded-2xl flex items-start gap-3 my-4">
          <AlertCircle className="h-5 w-5 text-[#F9AD3C] mt-0.5" />
          <p className="text-[11px] text-[#F9AD3C] font-semibold leading-tight uppercase tracking-wider">{t('editProject.warnings.noteAutoSave')}</p>
        </div>
        <DialogFooter className="flex flex-row gap-3 pt-2">
          <Button variant="ghost" className="flex-1 rounded-2xl font-bold text-gray-400" onClick={() => onOpenChange(false)}>{t('editProject.buttons.cancel')}</Button>
          <Button className="flex-1 bg-[#36A39D] hover:bg-[#2b8580] text-white rounded-2xl font-bold shadow-lg shadow-[#36A39D]/20" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('editProject.buttons.yesStart')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RollbackModal({ open, onOpenChange, project, targetPhase, isLoading, onConfirm }: any) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-white rounded-3xl p-6 border-none shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
            <RotateCcw className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-gray-900">{t('editProject.rollbackModal.title', 'Rework Phase')}</DialogTitle>
            <DialogDescription className="text-gray-500 px-2 leading-relaxed">
              {t('editProject.rollbackModal.desc', `Anda akan memundurkan fase proyek dari`)} <br/>
              <span className="font-bold text-gray-800">{project?.currentPhase}</span> &rarr; <span className="font-bold text-red-600">{targetPhase}</span>.<br/><br/>
              Tindakan ini akan mengarsipkan status saat ini (Cycle {project?.cycle || 1}) dan memulai Cycle { (project?.cycle || 1) + 1 } untuk fase tersebut.
            </DialogDescription>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 my-4">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-red-600 font-semibold leading-tight">Ketika anda menekan tombol konfirmasi ini, akan tersimpan di History.</p>
        </div>
        <DialogFooter className="flex flex-row gap-3 pt-2">
          <Button variant="ghost" className="flex-1 rounded-2xl font-bold text-gray-400" onClick={() => onOpenChange(false)}>{t('editProject.buttons.cancel', 'Batal')}</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('editProject.buttons.yesRollback', 'Ya, Rework')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}