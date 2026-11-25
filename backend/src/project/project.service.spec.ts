import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

/**
 * Mutation flows that the phase-transition suite above does not reach:
 * the cycle rollover, the test-case/defect transaction, the SIT full-state
 * sync and the generated-id collision retry.
 */
describe('ProjectService — mutation flows', () => {
  const makePrismaMock = () => ({
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
      delete: jest.fn(),
    },
    sDLCPhase: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({}),
    },
    testCase: {
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Tester' }),
    },
    defect: {
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    sitProcess: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    weeklyProgress: { create: jest.fn() },
    task: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    issue: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    improvement: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  });

  let prisma: ReturnType<typeof makePrismaMock>;
  let auditLog: jest.Mock;
  let service: ProjectService;

  beforeEach(() => {
    prisma = makePrismaMock();
    auditLog = jest.fn().mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (cb: any) =>
      typeof cb === 'function' ? cb(prisma) : Promise.all(cb),
    );

    service = new ProjectService(
      prisma as unknown as PrismaService,
      { log: auditLog } as unknown as AuditService,
    );
  });

  describe('nextCycle', () => {
    it('closes the old cycle and seeds the master phases for the new one', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'PRJ-001',
        name: 'Project One',
        currentPhase: 'UAT',
        cycle: 2,
        status: 'on-track',
        overallProgress: 80,
        sdlcPhases: [],
      });
      prisma.project.update.mockResolvedValue({ id: 'PRJ-001', name: 'Project One' });
      prisma.project.findUnique.mockResolvedValue({
        id: 'PRJ-001',
        name: 'Project One',
        currentPhase: 'UAT',
        cycle: 2,
        status: 'on-track',
        overallProgress: 80,
        sdlcPhases: [],
      });

      await service.nextCycle('PRJ-001', 'user-1');

      // Active phase of the old cycle keeps its real progress instead of 100.
      expect(prisma.sDLCPhase.updateMany).toHaveBeenCalledWith({
        where: { projectId: 'PRJ-001', cycle: 2, phaseName: 'UAT' },
        data: { progress: 80, status: 'on-track' },
      });
      // Phases before the active one are locked to completed.
      expect(prisma.sDLCPhase.updateMany).toHaveBeenCalledWith({
        where: { projectId: 'PRJ-001', cycle: 2, phaseName: 'Requirement' },
        data: { status: 'completed', progress: 100 },
      });
      // Project moves to cycle 3 with a reset progress.
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'PRJ-001' },
        data: expect.objectContaining({ cycle: 3, overallProgress: 0, currentPhase: 'Requirement' }),
      });
      // Six fresh phase rows for the new cycle.
      expect(prisma.sDLCPhase.create).toHaveBeenCalledTimes(6);
      expect(prisma.sDLCPhase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ cycle: 3, phaseName: 'Requirement', status: 'on-track' }),
      });
      expect(auditLog).toHaveBeenCalledWith(
        'user-1',
        'NEXT_CYCLE',
        expect.stringContaining('Cycle 3'),
        'PRJ-001',
      );
    });

    it('starts the new cycle at the requested target phase', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'PRJ-001',
        name: 'Project One',
        currentPhase: 'Live',
        cycle: 1,
        status: 'completed',
        overallProgress: 100,
        sdlcPhases: [],
      });
      prisma.project.update.mockResolvedValue({ id: 'PRJ-001', name: 'Project One' });

      await service.nextCycle('PRJ-001', 'user-1', { targetPhase: 'SIT' });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'PRJ-001' },
        data: expect.objectContaining({ currentPhase: 'SIT' }),
      });
      expect(prisma.sDLCPhase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ phaseName: 'SIT', status: 'on-track' }),
      });
      expect(prisma.sDLCPhase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ phaseName: 'Requirement', status: 'pending' }),
      });
    });

    it('throws NotFoundException for an unknown project', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.nextCycle('PRJ-404', 'user-1')).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('updateTestCase', () => {
    it('rejects a fail status without a defect description', async () => {
      await expect(
        service.updateTestCase('tc-1', { status: 'fail' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.testCase.update).not.toHaveBeenCalled();
    });

    it('upserts the defect when the test case fails', async () => {
      prisma.testCase.update.mockResolvedValue({ id: 'tc-1', projectId: 'PRJ-001', title: 'TC' });

      await service.updateTestCase(
        'tc-1',
        { status: 'fail', defect: { description: 'Boom', severity: 'high' } } as any,
        'user-1',
      );

      expect(prisma.defect.upsert).toHaveBeenCalledWith({
        where: { testCaseId: 'tc-1' },
        update: { description: 'Boom', severity: 'high', status: 'open' },
        create: { testCaseId: 'tc-1', description: 'Boom', severity: 'high', status: 'open' },
      });
      expect(prisma.defect.deleteMany).not.toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(
        'user-1',
        'UPDATE_TEST_CASE',
        expect.stringContaining('fail'),
        'PRJ-001',
      );
    });

    it('clears a stale defect when the test case passes', async () => {
      prisma.testCase.update.mockResolvedValue({ id: 'tc-1', projectId: 'PRJ-001', title: 'TC' });

      await service.updateTestCase('tc-1', { status: 'pass' } as any, 'user-1');

      expect(prisma.defect.deleteMany).toHaveBeenCalledWith({
        where: { testCaseId: 'tc-1' },
      });
      expect(prisma.defect.upsert).not.toHaveBeenCalled();
    });
  });

  describe('replaceSitProcesses', () => {
    it('summarises additions, removals and transitions in one audit entry', async () => {
      prisma.sitProcess.findMany
        .mockResolvedValueOnce([
          { id: 'fixed:plan', name: 'Plan', status: 'pending' },
          { id: 'dyn-1', name: 'Old step', status: 'done' },
        ])
        .mockResolvedValueOnce([{ id: 'fixed:plan', name: 'Plan', status: 'done' }]);

      await service.replaceSitProcesses(
        {
          projectId: 'PRJ-001',
          processes: [
            { id: 'fixed:plan', key: 'plan', name: 'Plan', status: 'done', order: 0 },
            { id: 'dyn-2', name: 'New step', status: 'pending', order: 1 },
          ],
        } as any,
        'user-1',
      );

      expect(prisma.sitProcess.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'PRJ-001' } });
      expect(prisma.sitProcess.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'fixed:plan', key: 'plan', status: 'done' }),
        ]),
      });

      const [, action, detail] = auditLog.mock.calls[0];
      expect(action).toBe('UPDATE_SIT_PROCESS');
      expect(detail).toContain('Menambahkan proses SIT');
      expect(detail).toContain('Menghapus proses SIT');
      expect(detail).toContain('"Plan" pending -> done');
    });

    it('writes no audit entry when nothing actually changed', async () => {
      const unchanged = [{ id: 'fixed:plan', name: 'Plan', status: 'done' }];
      prisma.sitProcess.findMany.mockResolvedValue(unchanged);

      await service.replaceSitProcesses(
        {
          projectId: 'PRJ-001',
          processes: [{ id: 'fixed:plan', key: 'plan', name: 'Plan', status: 'done', order: 0 }],
        } as any,
        'user-1',
      );

      expect(auditLog).not.toHaveBeenCalled();
    });
  });

  describe('insertWithGeneratedId (id collision retry)', () => {
    const collisionError = () => {
      const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      return err;
    };

    it('regenerates the id and retries after a P2002 collision', async () => {
      prisma.issue.create
        .mockRejectedValueOnce(collisionError())
        .mockResolvedValueOnce({ id: 1, issueId: 'ISS-002' });

      const issue = await service.createIssue(
        { title: 'Bug', priority: 'high', description: 'x', projectId: 'PRJ-001' } as any,
        'user-1',
      );

      expect(prisma.issue.create).toHaveBeenCalledTimes(2);
      expect(issue).toEqual({ id: 1, issueId: 'ISS-002' });
    });

    it('throws InternalServerErrorException after exhausting the retries', async () => {
      prisma.issue.create.mockRejectedValue(collisionError());

      await expect(
        service.createIssue(
          { title: 'Bug', priority: 'high', description: 'x', projectId: 'PRJ-001' } as any,
          'user-1',
        ),
      ).rejects.toThrow(InternalServerErrorException);

      // 1 initial attempt + 3 retries
      expect(prisma.issue.create).toHaveBeenCalledTimes(4);
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('does not retry a non-collision error', async () => {
      prisma.issue.create.mockRejectedValue(new Error('connection reset'));

      await expect(
        service.createIssue(
          { title: 'Bug', priority: 'high', description: 'x', projectId: 'PRJ-001' } as any,
          'user-1',
        ),
      ).rejects.toThrow('connection reset');

      expect(prisma.issue.create).toHaveBeenCalledTimes(1);
    });

    it('normalises a bare numeric issue id to the ISS- format', async () => {
      prisma.issue.create.mockResolvedValue({ id: 1, issueId: 'ISS-012' });

      await service.createIssue(
        {
          title: 'Bug',
          priority: 'high',
          description: 'x',
          projectId: 'PRJ-001',
          issueId: '12',
        } as any,
        'user-1',
      );

      expect(prisma.issue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ issueId: 'ISS-012' }),
      });
    });
  });

  describe('create (client-supplied project code)', () => {
    it('maps a duplicate project code to ConflictException instead of retrying', async () => {
      prisma.project.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create(
          { name: 'P', pic: 'Budi', code: 'PRJ-001' } as any,
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);

      expect(prisma.project.create).toHaveBeenCalledTimes(1);
      expect(auditLog).not.toHaveBeenCalled();
    });
  });
});
