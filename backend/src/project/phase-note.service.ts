import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { AuditLogger, ProjectDatabase } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';
import type { ProjectSupportService } from './project-support.service';

/** Free-text progress notes attached to one SDLC phase of a project. */
@Injectable()
export class PhaseNoteService {
  constructor(
    @Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase,
    @Inject(PROJECT_ADAPTERS.audit) private readonly audit: AuditLogger,
    @Inject(PROJECT_ADAPTERS.support) private readonly support: ProjectSupportService,
  ) { }

  async addPhaseNote(phaseId: number, content: string, userId: string) {
    const trimmedContent = (content ?? '').trim();
    if (!trimmedContent) {
      throw new BadRequestException('Isi catatan tidak boleh kosong.');
    }

    // Validasi fase dulu supaya tidak ada catatan orphan untuk phaseId palsu.
    const phase = await this.support.findOrThrow(
      () => this.db.sDLCPhase.findUnique({ where: { id: phaseId }, include: { project: true } }),
      'Fase',
    );

    const createdBy = await this.support.resolveUserName(userId);

    const note = await this.db.phaseNote.create({
      data: { phaseId, content: trimmedContent, createdBy },
    });

    await this.audit.log(
      userId,
      'ADD_PHASE_NOTE',
      `Menambahkan catatan ke fase ${phase.phaseName} (Cycle ${phase.cycle}) pada project ${phase.project.name}`,
      phase.projectId,
    );
    return note;
  }

  async getPhaseNotes(phaseId: number) {
    return this.db.phaseNote.findMany({
      where: { phaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deletePhaseNote(noteId: number, userId: string) {
    const note = await this.support.findOrThrow(
      () => this.db.phaseNote.findUnique({ where: { id: noteId }, include: { phase: { include: { project: true } } } }),
      'Catatan',
    );

    await this.db.phaseNote.delete({ where: { id: noteId } });

    if (note.phase) {
      await this.audit.log(
        userId,
        'DELETE_PHASE_NOTE',
        `Menghapus catatan dari fase ${note.phase.phaseName} pada project ${note.phase.project.name}`,
        note.phase.projectId,
      );
    }

    return { success: true };
  }
}
