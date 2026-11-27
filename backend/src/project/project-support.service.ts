import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLogger, ProjectDatabase, UserDirectory } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';

/** Fallback actor name when the stored user id cannot be resolved. */
export const UNKNOWN_USER = 'Unknown User';

/** Resolves a user id (or email) to the display name used in audit/labels. */
@Injectable()
export class UserNameResolver implements UserDirectory {
  constructor(private readonly prisma: PrismaService) { }

  async findDisplayName(userIdOrEmail: string): Promise<string | null> {
    if (!userIdOrEmail) return null;
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: userIdOrEmail }, { email: userIdOrEmail }] },
    });
    return user?.name ?? null;
  }
}

/**
 * Small, cross-cutting behaviours shared by every project feature service:
 * 404-on-missing loading, "resolve actor name" and the find -> delete -> audit
 * pattern. All of them are collaborators, not base classes, so each feature
 * service composes only what it needs.
 */
@Injectable()
export class ProjectSupportService {
  constructor(
    @Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase,
    @Inject(PROJECT_ADAPTERS.audit) private readonly audit: AuditLogger,
    @Inject(PROJECT_ADAPTERS.users) private readonly users: UserDirectory,
  ) { }

  /** Resolve a display name from a user id or email ("Unknown User" as fallback). */
  async resolveUserName(userId: string): Promise<string> {
    const name = await this.users.findDisplayName(userId);
    return name ?? UNKNOWN_USER;
  }

  /** Load a record by id, throwing 404 when it does not exist. */
  async findOrThrow<T>(load: () => Promise<T | null>, label: string): Promise<T> {
    const record = await load();
    if (!record) throw new NotFoundException(`${label} not found`);
    return record;
  }

  /** Recompute completed/total/progress on a weekly progress row from its tasks. */
  async recalcWeeklyProgress(weeklyProgressId: number): Promise<void> {
    const parent = await this.db.weeklyProgress.findUnique({
      where: { id: weeklyProgressId },
      include: { tasks: true },
    });
    if (!parent) return;

    const total = parent.tasks.length;
    const completed = parent.tasks.filter((t) => t.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    await this.db.weeklyProgress.update({
      where: { id: weeklyProgressId },
      data: { total, completed, progress },
    });
  }

  /**
   * The find -> delete -> audit pattern shared by every remove* method:
   * load the row (404 when missing), delete it, then write one audit entry
   * describing what was removed. `afterRemove` runs between the two so callers
   * can recalculate parent aggregates before the log is written.
   */
  async deleteAndLog<T>(params: {
    load: () => Promise<T | null>;
    remove: () => Promise<unknown>;
    label: string;
    userId: string;
    action: string;
    details: (record: T) => string;
    projectId: (record: T) => string | undefined;
    afterRemove?: (record: T) => Promise<void>;
  }): Promise<T> {
    const record = await this.findOrThrow(params.load, params.label);
    await params.remove();
    if (params.afterRemove) await params.afterRemove(record);
    await this.audit.log(
      params.userId,
      params.action,
      params.details(record),
      params.projectId(record),
    );
    return record;
  }
}
