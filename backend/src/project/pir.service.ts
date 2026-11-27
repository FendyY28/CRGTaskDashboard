import { Inject, Injectable } from '@nestjs/common';
import {
  CreateImprovementDto,
  CreateIssueDto,
  UpdateIssueDto,
} from './dto/project-payloads.dto';
import type { AuditLogger, IdGenerator, ProjectDatabase } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';
import type { ProjectSupportService } from './project-support.service';
import { normalizeIssueId } from './project-text.utils';

/**
 * Post-Implementation Review data: project issues and improvement notes.
 * Both are small, project-scoped records whose only invariant is the
 * generated `ISS-xxx` / `IMP-xxx` identifier.
 */
@Injectable()
export class PirService {
  constructor(
    @Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase,
    @Inject(PROJECT_ADAPTERS.audit) private readonly audit: AuditLogger,
    @Inject(PROJECT_ADAPTERS.support) private readonly support: ProjectSupportService,
    @Inject(PROJECT_ADAPTERS.ids) private readonly ids: IdGenerator,
  ) { }

  // -------------------------------------------------------------------------
  // Issues
  // -------------------------------------------------------------------------

  async findAllIssues() {
    // `Issue.projectId` is a required relation with onDelete: Cascade, so an
    // issue can never exist without its project — no extra filter is needed.
    return this.db.issue.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { reportedDate: 'desc' },
    });
  }

  async createIssue(data: CreateIssueDto, userId: string) {
    const requestedIssueId = normalizeIssueId(data.issueId);
    const issue = await this.ids.insertWithGeneratedId(
      () =>
        requestedIssueId ? Promise.resolve(requestedIssueId) : this.ids.nextId('ISS', 'issue'),
      (issueId) =>
        this.db.issue.create({
          data: {
            issueId,
            title: data.title,
            priority: data.priority,
            description: data.description,
            impactArea: data.impactArea || 'General',
            reportedBy: data.reportedBy || 'System',
            status: 'open',
            projectId: data.projectId,
          },
        }),
      'issue',
    );

    await this.audit.log(
      userId,
      'CREATE_ISSUE',
      `Report Issue baru: ${data.title} (${issue.issueId})`,
      data.projectId,
    );
    return issue;
  }

  async updateIssue(id: number, data: UpdateIssueDto, userId: string) {
    // Validated up-front so a missing issue is a 404, not a Prisma error.
    await this.support.findOrThrow(
      () => this.db.issue.findUnique({ where: { id: Number(id) } }),
      'Issue',
    );

    const issue = await this.db.issue.update({
      where: { id: Number(id) },
      data: { status: data.status },
    });
    await this.audit.log(
      userId,
      'UPDATE_ISSUE',
      `Update status Issue ${issue.issueId} menjadi ${data.status}`,
      issue.projectId ?? undefined,
    );
    return issue;
  }

  async removeIssue(id: number, userId: string) {
    return this.support.deleteAndLog({
      load: () => this.db.issue.findUnique({ where: { id: Number(id) } }),
      remove: () => this.db.issue.delete({ where: { id: Number(id) } }),
      label: 'Issue',
      userId,
      action: 'DELETE_ISSUE',
      details: (issue) => `Menghapus Issue: ${issue.title}`,
      projectId: (issue) => issue.projectId,
    });
  }

  // -------------------------------------------------------------------------
  // Improvement notes
  // -------------------------------------------------------------------------

  async createImprovement(data: CreateImprovementDto, userId: string) {
    // noteId selalu digenerate agar format konsisten (IMP-xxx) — client tidak
    // bisa lagi menentukan sendiri ID-nya lewat body.
    const improvement = await this.ids.insertWithGeneratedId(
      () => this.ids.nextId('IMP', 'improvement'),
      (noteId) =>
        this.db.improvement.create({
          data: {
            noteId,
            title: data.title || 'Optimization Idea',
            // Kolom ini wajib di DB, jadi beri default aman kalau form tidak mengisi.
            reviewer: data.reviewer || 'Unknown User',
            developer: data.developer || 'Unknown User',
            feedback: data.feedback || '',
            recommendations: data.recommendations || '',
            priority: data.priority || 'medium',
            projectId: data.projectId,
          },
        }),
      'improvement',
    );

    await this.audit.log(
      userId,
      'ADD_IMPROVEMENT',
      `Menambah catatan improvement untuk project (${improvement.noteId})`,
      data.projectId,
    );
    return improvement;
  }

  async removeImprovement(id: number, userId: string) {
    return this.support.deleteAndLog({
      load: () => this.db.improvement.findUnique({ where: { id: Number(id) } }),
      remove: () => this.db.improvement.delete({ where: { id: Number(id) } }),
      label: 'Improvement',
      userId,
      action: 'DELETE_IMPROVEMENT',
      details: (improvement) => `Menghapus Ide Optimalisasi: ${improvement.title}`,
      projectId: (improvement) => improvement.projectId,
    });
  }
}
