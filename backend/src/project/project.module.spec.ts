import { Test } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { AuditModule } from '../audit/audit.module';
import { PhaseNoteService } from './phase-note.service';
import { PirService } from './pir.service';
import { ProjectController } from './project.controller';
import { ProjectLifecycleService } from './project-lifecycle.service';
import { ProjectService } from './project.service';
import { ProjectSupportService, UserNameResolver } from './project-support.service';
import { ProjectModule } from './project.module';
import { PROJECT_ADAPTERS } from './project.tokens';
import { SequentialIdService } from './sequential-id.service';
import { SitProcessService } from './sit-process.service';
import { TestingService } from './testing.service';
import { WeeklyLogService } from './weekly-log.service';

/**
 * The project domain is split into small services wired through capability
 * tokens; nothing else compiles the Nest container in the unit suite, so this
 * guards the wiring: a missing provider or an unbound token fails here instead
 * of at application boot.
 */
describe('ProjectModule — dependency injection graph', () => {
  it('resolves the facade, every feature service and every adapter token', async () => {
    const auditStub = { log: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [ProjectModule, AuditModule],
    })
      // Real DB/mailer are irrelevant for wiring: the graph only needs the
      // providers the module declares.
      .overrideProvider(AuditService)
      .useValue(auditStub)
      .compile();

    for (const provider of [
      ProjectService,
      ProjectLifecycleService,
      PirService,
      WeeklyLogService,
      TestingService,
      SitProcessService,
      PhaseNoteService,
      ProjectSupportService,
      SequentialIdService,
      UserNameResolver,
      ProjectController,
    ]) {
      expect(moduleRef.get(provider, { strict: false })).toBeDefined();
    }

    // Each port resolves to the adapter the module bound to it.
    expect(moduleRef.get(PROJECT_ADAPTERS.database, { strict: false })).toBeDefined();
    expect(moduleRef.get(PROJECT_ADAPTERS.audit, { strict: false })).toBe(auditStub);
    expect(moduleRef.get(PROJECT_ADAPTERS.users, { strict: false })).toBeInstanceOf(UserNameResolver);
    expect(moduleRef.get(PROJECT_ADAPTERS.ids, { strict: false })).toBeInstanceOf(SequentialIdService);
    expect(moduleRef.get(PROJECT_ADAPTERS.support, { strict: false })).toBeInstanceOf(ProjectSupportService);

    await moduleRef.close();
  });
});
