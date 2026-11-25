import { BadRequestException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Covers the filter builder and pagination clamps that the audit trail page and
 * its CSV export both rely on. Prisma is mocked; no database is required.
 */
describe('AuditService', () => {
  const makePrismaMock = () => ({
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    },
    user: { findFirst: jest.fn() },
    project: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  });

  let prisma: ReturnType<typeof makePrismaMock>;
  let service: AuditService;

  const lastWhere = () => prisma.auditLog.findMany.mock.calls[0][0].where;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new AuditService(prisma as unknown as PrismaService);
  });

  describe('getLogs — filters', () => {
    it('omits filters that are absent or set to ALL', async () => {
      await service.getLogs({ projectId: 'ALL', userId: 'ALL', action: 'ALL' });
      expect(lastWhere()).toEqual({});
    });

    it('matches the project by id or by a mention in the details text', async () => {
      await service.getLogs({ projectId: 'PRJ-001' });
      expect(lastWhere()).toEqual({
        OR: [
          { projectId: 'PRJ-001' },
          { details: { contains: 'PRJ-001', mode: 'insensitive' } },
        ],
      });
    });

    it('combines the project filter with the free-text search', async () => {
      await service.getLogs({ projectId: 'PRJ-001', search: '  budi  ' });
      expect(lastWhere()).toEqual({
        OR: [
          { projectId: 'PRJ-001' },
          { details: { contains: 'PRJ-001', mode: 'insensitive' } },
        ],
        AND: [
          {
            OR: [
              { details: { contains: 'budi', mode: 'insensitive' } },
              { userName: { contains: 'budi', mode: 'insensitive' } },
              { action: { contains: 'budi', mode: 'insensitive' } },
              { project: { name: { contains: 'budi', mode: 'insensitive' } } },
              { project: { id: { contains: 'budi', mode: 'insensitive' } } },
            ],
          },
        ],
      });
    });

    it('extends the end date to the last millisecond of that day', async () => {
      await service.getLogs({ startDate: '2026-01-01', endDate: '2026-01-31' });
      expect(lastWhere().createdAt.gte).toEqual(new Date('2026-01-01'));
      expect(lastWhere().createdAt.lte).toEqual(new Date('2026-01-31T23:59:59.999'));
    });

    it('rejects an unparseable date filter', async () => {
      await expect(service.getLogs({ startDate: 'not-a-date' })).rejects.toThrow(BadRequestException);
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('rejects a start date after the end date', async () => {
      await expect(
        service.getLogs({ startDate: '2026-02-01', endDate: '2026-01-01' }),
      ).rejects.toThrow('startDate tidak boleh lebih besar dari endDate.');
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('uses the same project filter for the CSV export', async () => {
      await service.getLogsForExport({ projectId: 'PRJ-002' });
      expect(lastWhere()).toEqual({
        OR: [
          { projectId: 'PRJ-002' },
          { details: { contains: 'PRJ-002', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('getLogs — pagination', () => {
    it('clamps page and limit and derives the totals', async () => {
      prisma.auditLog.count.mockResolvedValue(45);

      const result = await service.getLogs({ page: -3, limit: 500 });

      const args = prisma.auditLog.findMany.mock.calls[0][0];
      expect(args.skip).toBe(0);
      expect(args.take).toBe(100);
      expect(result).toMatchObject({ total: 45, page: 1, limit: 100, totalPages: 1 });
    });

    it('never reports zero pages and falls back to the 20-row default', async () => {
      const result = await service.getLogs({});
      const args = prisma.auditLog.findMany.mock.calls[0][0];

      expect(args.take).toBe(20);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getLogsByProject', () => {
    it('shares the project scope filter used by the listing', async () => {
      await service.getLogsByProject('PRJ-003', 10);
      const args = prisma.auditLog.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        OR: [
          { projectId: 'PRJ-003' },
          { details: { contains: 'PRJ-003', mode: 'insensitive' } },
        ],
      });
      expect(args.take).toBe(10);
    });
  });
});

describe('AuditService — log()', () => {
  const makePrismaMock = () => ({
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    },
    user: { findFirst: jest.fn() },
    project: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  });

  let prisma: ReturnType<typeof makePrismaMock>;
  let service: AuditService;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new AuditService(prisma as unknown as PrismaService);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('does nothing when the actor does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.log('ghost', 'CREATE_PROJECT', 'detail', 'PRJ-001')).resolves.toBeUndefined();

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it('writes the log with the resolved user and a valid project id', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', name: 'Budi' });
    prisma.project.findUnique.mockResolvedValue({ id: 'PRJ-001' });

    await service.log('budi@example.com', 'ADD_TASK', 'Menambah task', 'PRJ-001');

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        userName: 'Budi',
        action: 'ADD_TASK',
        details: 'Menambah task',
        projectId: 'PRJ-001',
      },
    });
  });

  it('drops a projectId that no longer exists (FK safety)', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', name: 'Budi' });
    prisma.project.findUnique.mockResolvedValue(null);

    await service.log('user-1', 'DELETE_PROJECT', 'Menghapus project', 'PRJ-404');

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ projectId: null }),
    });
  });

  it('writes the log without a project id when none is given', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', name: 'Budi' });

    await service.log('user-1', 'LOGIN', 'Login berhasil');

    expect(prisma.project.findUnique).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ projectId: null }),
    });
  });

  it('swallows persistence errors and logs a readable message', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', name: 'Budi' });
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));

    await expect(service.log('user-1', 'ADD_TASK', 'detail')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('AUDIT ERROR'),
      expect.stringContaining('db down'),
    );
  });

  it('handles a thrown non-Error value without crashing', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-1', name: 'Budi' });
    prisma.auditLog.create.mockRejectedValue('boom');

    await expect(service.log('user-1', 'ADD_TASK', 'detail')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('AUDIT ERROR'),
      expect.stringContaining('boom'),
    );
  });
});
