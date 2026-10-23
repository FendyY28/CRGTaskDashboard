import { BadRequestException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { EmailVerifierService } from '../common/email-verifier.service';

/**
 * Identity must come from the JWT only. A body-supplied userId/performedBy is
 * client-controlled and would let anyone forge the audit trail.
 */
describe('ProjectController — actor identity', () => {
  const service = {
    create: jest.fn().mockResolvedValue({}),
    createTestCase: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  };
  const emailService = { verify: jest.fn().mockResolvedValue(true) };

  const controller = new ProjectController(
    service as unknown as ProjectService,
    emailService as unknown as EmailVerifierService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('uses the JWT user id, not a userId supplied in the body', async () => {
    const req = { user: { id: 'real-user', role: 'OFFICER' } };
    const body = { name: 'P', pic: 'A', userId: 'victim-user' };

    await controller.create(body, req);

    expect(service.create).toHaveBeenCalledWith(expect.anything(), 'real-user');
  });

  it('uses the JWT user id, not a performedBy supplied in the body', async () => {
    const req = { user: { id: 'real-user', role: 'OFFICER' } };
    const body = { projectId: 'PRJ-001', title: 't', type: 'positive', performedBy: 'victim-user' };

    await controller.createTestCase(body, req);

    expect(service.createTestCase).toHaveBeenCalledWith(expect.anything(), 'real-user');
  });

  it('ignores client-supplied identity fields when choosing the actor', async () => {
    // Stripping of unknown body fields now happens in the global ValidationPipe
    // (`whitelist: true`) — see validation.pipe.spec.ts. Here we assert only
    // that the controller never lets them influence who the audit log records.
    const req = { user: { id: 'real-user', role: 'OFFICER' } };
    const body = { name: 'P', pic: 'A', userId: 'victim', performedBy: 'victim' };

    await controller.create(body, req);

    expect(service.create).toHaveBeenCalledWith(expect.anything(), 'real-user');
  });

  it('rejects the request when there is no authenticated user', async () => {
    await expect(
      controller.create({ name: 'P', pic: 'A' }, {}),
    ).rejects.toThrow(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });
});
