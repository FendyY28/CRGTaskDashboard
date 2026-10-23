import { Injectable } from '@nestjs/common';
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
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
      },
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
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          project: { select: { id: true, name: true } },
        },
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
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  /** Shared filter -> Prisma `where` builder for listing and export. */
  private buildWhere(query: AuditQueryDto): { where: any } {
    const where: any = {};

    if (query.projectId && query.projectId !== 'ALL') {
      where.OR = [
        { projectId: query.projectId },
        { details: { contains: query.projectId, mode: 'insensitive' } }
      ];
    }

    if (query.userId && query.userId !== 'ALL') {
      where.userId = query.userId;
    }

    if (query.action && query.action !== 'ALL') {
      where.action = query.action;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.AND = [
        ...(where.AND || []),
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
      where: {
        OR: [
          { projectId },
          { details: { contains: projectId, mode: 'insensitive' } }
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
      },
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