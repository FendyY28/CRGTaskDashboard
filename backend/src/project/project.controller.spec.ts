import { BadRequestException } from '@nestjs/common';
import { getAuthenticatedUserId, type AuthenticatedRequest } from '../auth/current-user.decorator';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { CreateTestCaseDto } from './dto/project-payloads.dto';

/**
 * Identity must come from the JWT only. A body-supplied userId/performedBy is
 * client-controlled and would let anyone forge the audit trail.
 *
 * The id reaches handlers through `@CurrentUserId()`, which is the decorator's
 * resolver — so the resolver itself is what is asserted here.
 */
describe('ProjectController — actor identity', () => {
  const service = {
    create: jest.fn().mockResolvedValue({}),
    createTestCase: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  };

  const controller = new ProjectController(service as unknown as ProjectService);

  /** Stand-in for the decorator: same resolver, applied to a fake request. */
  const userIdOf = (req: Parameters<typeof getAuthenticatedUserId>[0]) =>
    getAuthenticatedUserId(req);

  beforeEach(() => jest.clearAllMocks());

  it('uses the JWT user id, not a userId supplied in the body', async () => {
    const req: AuthenticatedRequest = { user: { id: 'real-user', role: 'OFFICER' } } as AuthenticatedRequest;
    const body = { name: 'P', pic: 'A', userId: 'victim-user' } as unknown as CreateProjectDto;

    await controller.create(body, userIdOf(req));

    expect(service.create).toHaveBeenCalledWith(expect.anything(), 'real-user');
  });

  it('uses the JWT user id, not a performedBy supplied in the body', async () => {
    const req: AuthenticatedRequest = { user: { id: 'real-user', role: 'OFFICER' } } as AuthenticatedRequest;
    const body = {
      projectId: 'PRJ-001',
      title: 't',
      type: 'positive',
      performedBy: 'victim-user',
    } as unknown as CreateTestCaseDto;

    await controller.createTestCase(body, userIdOf(req));

    expect(service.createTestCase).toHaveBeenCalledWith(expect.anything(), 'real-user');
  });

  it('ignores client-supplied identity fields when choosing the actor', async () => {
    // Stripping of unknown body fields happens in the global ValidationPipe
    // (`whitelist: true`) — see validation.pipe.spec.ts. Here we assert only
    // that the controller never lets them influence who the audit log records.
    const req: AuthenticatedRequest = { user: { id: 'real-user', role: 'OFFICER' } } as AuthenticatedRequest;
    const body = { name: 'P', pic: 'A', userId: 'victim', performedBy: 'victim' } as unknown as CreateProjectDto;

    await controller.create(body, userIdOf(req));

    expect(service.create).toHaveBeenCalledWith(expect.anything(), 'real-user');
  });

  it('rejects the request when there is no authenticated user', async () => {
    expect(() => userIdOf({} as AuthenticatedRequest)).toThrow(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });
});
