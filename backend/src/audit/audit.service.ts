import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditQueryDto {
  projectId?: string;
  userId?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/** Upper bound for a single CSV export so one request cannot load the whole table. */
const EXPORT_MAX_ROWS = 10_000;

/** Relations every audit-log listing returns, defined once. */
const AUDIT_LOG_INCLUDE = {
  user: { select: { id: true, name: true, email: true, role: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.AuditLogInclude;

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string, action: string, details: string, projectId?: string) {
    try {
      // Resolve the actor by id or email.
      const user = await this.prisma.user.findFirst({
        where: { OR: [{ id: userId }, { email: userId }] }
      });

      // Skip the log if the actor doesn't exist rather than failing the caller.
      if (!user) {
        console.warn(`⚠️ [AUDIT WARNING] User ID '${userId}' tidak ditemukan. Log dilewati agar server tidak crash.`);
        return;
      }

      // Only keep projectId when the project actually exists (FK safety).
      let validProjectId: string | null = null;
      if (projectId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (project) {
          validProjectId = project.id;
        }
      }

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          action,
          details,
          projectId: validProjectId,
        },
      });

    } catch (error: any) {
      // Never let audit failures break the main request.
      console.error("❌ [AUDIT ERROR] Gagal menyimpan log:", error.message);
    }
  }

  async getRecentLogs() {
    return this.prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: AUDIT_LOG_INCLUDE,
    });
  }

  async getLogs(query: AuditQueryDto) {
    const { where } = this.buildWhere(query);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: AUDIT_LOG_INCLUDE,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** All logs matching the filters, unpaginated — used by the CSV export. */
  async getLogsForExport(query: AuditQueryDto) {
    const { where } = this.buildWhere(query);

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_MAX_ROWS,
      include: AUDIT_LOG_INCLUDE,
    });
  }

  /**
   * Filter for "belongs to this project": the FK match plus a details-text
   * match, so older rows logged before the FK existed still show up.
   */
  private projectScopeFilter(projectId: string): Prisma.AuditLogWhereInput[] {
    return [
      { projectId },
      { details: { contains: projectId, mode: 'insensitive' as const } },
    ];
  }

  /** Parse a `YYYY-MM-DD` (or ISO) filter value, rejecting unparseable input. */
  private parseFilterDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Format ${field} tidak valid.`);
    }
    return date;
  }

  /** Shared filter -> Prisma `where` builder for listing and export. */
  private buildWhere(query: AuditQueryDto): { where: Prisma.AuditLogWhereInput } {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.projectId && query.projectId !== 'ALL') {
      where.OR = this.projectScopeFilter(query.projectId);
    }

    if (query.userId && query.userId !== 'ALL') {
      where.userId = query.userId;
    }

    if (query.action && query.action !== 'ALL') {
      where.action = query.action;
    }

    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        createdAt.gte = this.parseFilterDate(query.startDate, 'startDate');
      }
      if (query.endDate) {
        const end = this.parseFilterDate(query.endDate, 'endDate');
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      if (
        createdAt.gte instanceof Date &&
        createdAt.lte instanceof Date &&
        createdAt.gte > createdAt.lte
      ) {
        throw new BadRequestException('startDate tidak boleh lebih besar dari endDate.');
      }
      where.createdAt = createdAt;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...existingAnd,
        {
          OR: [
            { details: { contains: s, mode: 'insensitive' } },
            { userName: { contains: s, mode: 'insensitive' } },
            { action: { contains: s, mode: 'insensitive' } },
            { project: { name: { contains: s, mode: 'insensitive' } } },
            { project: { id: { contains: s, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    return { where };
  }

  async getLogsByProject(projectId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { OR: this.projectScopeFilter(projectId) },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: AUDIT_LOG_INCLUDE,
    });
  }

  async getFilterOptions() {
    const [users, actions, projects] = await Promise.all([
      this.prisma.auditLog.findMany({
        select: { userId: true, userName: true },
        distinct: ['userId'],
        orderBy: { userName: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      this.prisma.project.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      users: users.map(u => ({ id: u.userId, name: u.userName })),
      actions: actions.map(a => a.action),
      projects,
    };
  }
}