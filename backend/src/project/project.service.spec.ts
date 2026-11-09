import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateProjectDto } from './dto/update-project.dto';

/**
 * Focused on the cycle-aware update path: the phase transition helpers, the
 * field mapping and the transaction orchestration in `update()`.
 * Prisma and AuditService are mocked; no database is required.
 */
describe('ProjectService — phase transitions', () => {
  const makePrismaMock = () => ({
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sDLCPhase: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  });

  let prisma: ReturnType<typeof makePrismaMock>;
  let auditLog: jest.Mock;
  let service: ProjectService;

  const oldProject = (overrides: Record<string, unknown> = {}) => ({
    id: 'PRJ-001',
    name: 'Project One',
    currentPhase: 'Development',
    cycle: 1,
    status: 'on-track',
    sdlcPhases: [],
    ...overrides,
  });

  beforeEach(() => {
    prisma = makePrismaMock();
    auditLog = jest.fn().mockResolvedValue(undefined);

    // Run the transaction callback against the same mocked client.
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));

    service = new ProjectService(
      prisma as unknown as PrismaService,
      { log: auditLog } as unknown as AuditService,
    );
  });

  it('moves the active cycle phase and closes the old one on a phase change', async () => {
    prisma.project.findUnique.mockResolvedValue(oldProject());
    prisma.sDLCPhase.findFirst.mockResolvedValue({ id: 11 });
    prisma.project.update.mockResolvedValue({ ...oldProject(), currentPhase: 'SIT' });

    await service.update('PRJ-001', { currentPhase: 'SIT' } as UpdateProjectDto, 'user-1');

    // Old phase (Development, cycle 1) is closed.
    expect(prisma.sDLCPhase.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'PRJ-001', phaseName: 'Development', cycle: 1 },
      data: { status: 'completed', progress: 100 },
    });
    // Existing target phase row is reused instead of duplicated.
    expect(prisma.sDLCPhase.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: expect.objectContaining({ status: 'on-track' }),
    });
    expect(prisma.sDLCPhase.create).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      'user-1',
      'CHANGE_PHASE',
      expect.stringContaining('SIT'),
      'PRJ-001',
    );
  });

  it('creates the target phase row when the cycle does not have it yet', async () => {
    prisma.project.findUnique.mockResolvedValue(oldProject());
    prisma.sDLCPhase.findFirst.mockResolvedValue(null);
    prisma.project.update.mockResolvedValue({ ...oldProject(), currentPhase: 'Live' });

    await service.update('PRJ-001', { currentPhase: 'Live' } as UpdateProjectDto, 'user-1');

    expect(prisma.sDLCPhase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phaseName: 'Live',
        cycle: 1,
        project: { connect: { id: 'PRJ-001' } },
      }),
    });
  });

  it('only updates the active phase detail when the phase is unchanged', async () => {
    prisma.project.findUnique.mockResolvedValue(oldProject());
    prisma.project.update.mockResolvedValue(oldProject());

    await service.update(
      'PRJ-001',
      { phaseStatus: 'at-risk', phaseDeadline: '2026-02-01' } as UpdateProjectDto,
      'user-1',
    );

    expect(prisma.sDLCPhase.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.sDLCPhase.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'PRJ-001', phaseName: 'Development', cycle: 1 },
      data: {
        status: 'at-risk',
        deadline: new Date('2026-02-01'),
      },
    });
    expect(prisma.sDLCPhase.update).not.toHaveBeenCalled();
    expect(prisma.sDLCPhase.create).not.toHaveBeenCalled();
  });

  it('writes only the fields present in a partial payload', async () => {
    prisma.project.findUnique.mockResolvedValue(oldProject());
    prisma.project.update.mockResolvedValue(oldProject());

    await service.update('PRJ-001', { pic: 'Budi' } as UpdateProjectDto, 'user-1');

    const updateArgs = prisma.project.update.mock.calls[0][0];
    expect(updateArgs.data).toEqual({ currentPhase: 'Development', pic: 'Budi' });
    expect(updateArgs.data).not.toHaveProperty('overallProgress');
    expect(updateArgs.data).not.toHaveProperty('projectDeadline');
    // Nothing to write on the phase row -> no phase update at all.
    expect(prisma.sDLCPhase.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a phase that is not in the master phase list', async () => {
    prisma.project.findUnique.mockResolvedValue(oldProject());

    await expect(
      service.update('PRJ-001', { currentPhase: 'Bogus' } as unknown as UpdateProjectDto, 'user-1'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the project does not exist', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(
      service.update('PRJ-404', { pic: 'Budi' } as UpdateProjectDto, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
