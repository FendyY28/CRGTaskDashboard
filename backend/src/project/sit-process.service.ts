import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CreateSitProcessDto,
  ReplaceSitProcessesDto,
  UpdateSitProcessDto,
} from './dto/project-payloads.dto';
import type { AuditLogger, ProjectDatabase } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';
import type { ProjectSupportService } from './project-support.service';

/** A stored SIT step as the diff below needs to see it. */
interface StoredProcess {
  id: string;
  key: string | null;
  name: string;
  status: string;
}

/** The changes between the stored pipeline and the one the client sent. */
interface ProcessDiff {
  added: string[];
  removed: string[];
  transitions: string[];
}

// ==========================================================
// SIT PROCESS PIPELINE
// Semua perubahan status dicatat ke Audit Log agar jejak
// eksekusi SIT ikut tampil di halaman Audit Trail.
// ==========================================================
@Injectable()
export class SitProcessService {
  constructor(
    @Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase,
    @Inject(PROJECT_ADAPTERS.audit) private readonly audit: AuditLogger,
    @Inject(PROJECT_ADAPTERS.support) private readonly support: ProjectSupportService,
  ) { }

  async getSitProcesses(projectId: string) {
    return this.db.sitProcess.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  async createSitProcess(data: CreateSitProcessDto, userId: string) {
    if (!data.key && !data.name?.trim()) {
      throw new BadRequestException('Nama proses dinamis wajib diisi.');
    }

    const actorName = await this.support.resolveUserName(userId);
    const id = data.key
      ? `fixed:${data.key}`
      : `dyn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const displayName = data.key ? data.key : data.name!.trim();

    const process = await this.db.sitProcess.create({
      data: {
        id,
        key: data.key || null,
        name: displayName,
        status: data.status,
        order: data.order,
        createdBy: actorName,
        updatedBy: actorName,
        projectId: data.projectId,
      },
    });

    await this.audit.log(
      userId,
      'ADD_SIT_PROCESS',
      `Menambahkan proses SIT "${displayName}"`,
      data.projectId,
    );
    return process;
  }

  async updateSitProcess(id: string, data: UpdateSitProcessDto, projectId: string, userId: string) {
    const actorName = await this.support.resolveUserName(userId);
    const existing = await this.support.findOrThrow(
      () => this.db.sitProcess.findFirst({ where: { id, projectId } }),
      'Proses SIT',
    );

    const process = await this.db.sitProcess.update({
      where: { id },
      data: { status: data.status, updatedBy: actorName },
    });

    await this.audit.log(
      userId,
      'UPDATE_SIT_PROCESS',
      `Proses SIT "${existing.name}" -> ${data.status}`,
      projectId,
    );
    return process;
  }

  async deleteSitProcess(id: string, projectId: string, userId: string) {
    const existing = await this.support.findOrThrow(
      () => this.db.sitProcess.findFirst({ where: { id, projectId } }),
      'Proses SIT',
    );
    if (existing.key) {
      throw new BadRequestException('Proses standar tidak dapat dihapus.');
    }

    await this.db.sitProcess.delete({ where: { id } });
    await this.audit.log(
      userId,
      'DELETE_SIT_PROCESS',
      `Menghapus proses SIT "${existing.name}"`,
      projectId,
    );
    return { status: 'deleted' };
  }

  /**
   * Full-state sync used when the user (de)selects statuses or reorders the
   * pipeline locally: replaces the stored set with what the client holds and
   * writes ONE audit entry summarising every status transition.
   */
  async replaceSitProcesses(data: ReplaceSitProcessesDto, userId: string) {
    const actorName = await this.support.resolveUserName(userId);
    const projectId = data.projectId;

    const previous = await this.db.sitProcess.findMany({ where: { projectId } });
    const prevStatusById = new Map(previous.map((p) => [p.id, p.status]));

    await this.db.$transaction([
      this.db.sitProcess.deleteMany({ where: { projectId } }),
      this.db.sitProcess.createMany({
        data: data.processes.map((p) => ({
          id: p.id,
          key: p.key || null,
          name: p.name,
          status: p.status,
          order: p.order,
          createdBy: actorName,
          updatedBy: prevStatusById.get(p.id) !== p.status ? actorName : undefined,
          projectId,
        })),
      }),
    ]);

    const diff = describeChanges(previous, data.processes, prevStatusById);
    const detail = formatDiff(diff);
    if (detail) {
      await this.audit.log(userId, 'UPDATE_SIT_PROCESS', detail, projectId);
    }

    return this.getSitProcesses(projectId);
  }
}

function describeChanges(
  previous: StoredProcess[],
  incoming: ReplaceSitProcessesDto['processes'],
  prevStatusById: Map<string, string>,
): ProcessDiff {
  const transitions = incoming
    .filter((p) => prevStatusById.has(p.id) && prevStatusById.get(p.id) !== p.status)
    .map((p) => `"${p.name}" ${prevStatusById.get(p.id)} -> ${p.status}`);
  const added = incoming.filter((p) => !prevStatusById.has(p.id)).map((p) => `"${p.name}"`);
  const removed = previous
    .filter((p) => !incoming.some((next) => next.id === p.id))
    .map((p) => `"${p.name}"`);

  return { added, removed, transitions };
}

/** Human-readable, single-line summary of the diff, or `''` when nothing changed. */
function formatDiff({ added, removed, transitions }: ProcessDiff): string {
  const parts: string[] = [];
  if (added.length) parts.push(`Menambahkan proses SIT: ${added.join(', ')}`);
  if (removed.length) parts.push(`Menghapus proses SIT: ${removed.join(', ')}`);
  if (transitions.length) parts.push(`Update proses SIT: ${transitions.join('; ')}`);
  return parts.join(' | ');
}
