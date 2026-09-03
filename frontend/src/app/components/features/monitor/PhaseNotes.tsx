import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { api } from "../../../services/api";
import { THEME } from "../../../constants/projectConstants";
import { ProtectAction } from "../../auth/ProtectAction";
import { useTranslation } from "react-i18next";

interface PhaseNote {
  id: number;
  content: string;
  createdBy: string;
  createdAt: string;
}

interface PhaseNotesProps {
  phaseId: number | null;
  initialNotes: PhaseNote[];
  onRefresh: () => void;
}

function fmtDate(raw: string) {
  const d = new Date(raw);
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

export function PhaseNotes({ phaseId, initialNotes, onRefresh }: PhaseNotesProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Local state agar tampil langsung tanpa menunggu parent refetch
  const [notes, setNotes] = useState<PhaseNote[]>(initialNotes);

  // Sync ketika fase aktif berganti (phaseId berubah) atau saat sheet baru dibuka
  useEffect(() => {
    setNotes(initialNotes);
  }, [phaseId, initialNotes]);

  // PENTING: tidak pakai e.FormEvent agar tidak perlu <form> yang bisa trigger outer form
  const handleAdd = useCallback(async () => {
    if (!content.trim() || !phaseId || isSaving) return;
    setIsSaving(true);
    try {
      const newNote: PhaseNote = await api.post(`/project/phase/${phaseId}/note`, { content: content.trim() });
      setNotes(prev => [newNote, ...prev]);
      setContent("");
      setIsAdding(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan catatan");
    } finally {
      setIsSaving(false);
    }
  }, [content, phaseId, isSaving, onRefresh]);

  const handleDelete = useCallback(async (noteId: number) => {
    if (!window.confirm(t("editProject.phaseNotes.confirmDelete", "Hapus catatan ini?"))) return;
    setDeletingId(noteId);
    try {
      await api.delete(`/project/phase/note/${noteId}`);
      // Hapus dari local state langsung
      setNotes(prev => prev.filter(n => n.id !== noteId));
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus catatan");
    } finally {
      setDeletingId(null);
    }
  }, [onRefresh, t]);

  if (!phaseId) return null;

  return (
    <div className="space-y-3 mt-4 border-t border-gray-100 pt-4">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: THEME.TOSCA }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: THEME.BSI_GREY }}>
            {t("editProject.phaseNotes.title", "Catatan Fase")}
          </span>
          {notes.length > 0 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: THEME.TOSCA + "20", color: THEME.TOSCA }}
            >
              {notes.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isAdding && (
            <ProtectAction>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsAdding(true); setExpanded(true); }}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border border-dashed border-gray-300 hover:border-[#38A79C] hover:text-[#38A79C] text-gray-400 transition-all cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                {t("editProject.phaseNotes.addNote", "Tambah")}
              </button>
            </ProtectAction>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2">
          {/* Form tambah catatan */}
          {/* Input catatan — pakai <div> bukan <form> agar tidak trigger outer form di EditProjectSheet */}
          {isAdding && (
            <div
              className="p-3 bg-white rounded-xl border border-[#38A79C]/40 shadow-sm space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Textarea
                autoFocus
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd();
                }}
                placeholder={t("editProject.phaseNotes.placeholder", "Sedang mengerjakan apa di fase ini? Contoh: Finalisasi dokumen SRS...")}
                className="text-xs resize-none border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#38A79C] bg-gray-50/50"
                disabled={isSaving}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Ctrl+Enter untuk simpan</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsAdding(false); setContent(""); }}
                    className="h-7 text-xs text-gray-400 cursor-pointer"
                  >
                    {t("common.cancel", "Batal")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!content.trim() || isSaving}
                    onClick={handleAdd}
                    className="h-7 text-xs px-3 text-white rounded-lg cursor-pointer"
                    style={{ backgroundColor: THEME.TOSCA }}
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : t("common.save", "Simpan")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Daftar catatan */}
          {notes.length === 0 && !isAdding ? (
            <p className="text-[11px] italic text-center py-3" style={{ color: THEME.BSI_LIGHT_GRAY }}>
              {t("editProject.phaseNotes.noNotes", "Belum ada catatan untuk fase ini.")}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 group/note hover:border-gray-200 transition-all"
                >
                  {/* Avatar */}
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: THEME.TOSCA }}
                  >
                    {getInitials(note.createdBy)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold" style={{ color: THEME.BSI_DARK_GRAY }}>
                          {note.createdBy}
                        </span>
                        <span className="text-[10px]" style={{ color: THEME.BSI_LIGHT_GRAY }}>
                          {fmtDate(note.createdAt)}
                        </span>
                      </div>
                      <ProtectAction>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="h-5 w-5 opacity-0 group-hover/note:opacity-100 transition-all hover:bg-red-50 text-red-400 shrink-0"
                        >
                          {deletingId === note.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />
                          }
                        </Button>
                      </ProtectAction>
                    </div>
                    <p className="text-xs mt-1 whitespace-pre-wrap leading-relaxed" style={{ color: THEME.BSI_DARK_GRAY }}>
                      {note.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
