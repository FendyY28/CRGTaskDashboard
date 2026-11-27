import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { RolesGuard } from '../auth/roles.guard';
import { PhaseNoteService } from './phase-note.service';
import { PirService } from './pir.service';
import { ProjectLifecycleService } from './project-lifecycle.service';
import { ProjectSupportService, UserNameResolver } from './project-support.service';
import { SequentialIdService } from './sequential-id.service';
import { SitProcessService } from './sit-process.service';
import { TestingService } from './testing.service';
import { WeeklyLogService } from './weekly-log.service';
import { PROJECT_ADAPTERS, PROJECT_SERVICES } from './project.tokens';

/**
 * Project feature module.
 *
 * The feature services are wired through capability interfaces
 * (PROJECT_ADAPTERS): they receive "a database", "an audit logger" and "a user
 * directory" instead of the concrete Prisma/Audit classes. Swapping an
 * implementation is a one-line change here, not a change in every service.
 */
@Module({
  imports: [PrismaModule, ConfigModule, AuditModule],
  controllers: [ProjectController],
  providers: [
    {
      provide: PROJECT_ADAPTERS.database,
      useExisting: PrismaService,
    },
    {
      provide: PROJECT_ADAPTERS.audit,
      useExisting: AuditService,
    },
    UserNameResolver,
    {
      provide: PROJECT_ADAPTERS.users,
      useExisting: UserNameResolver,
    },

    SequentialIdService,
    {
      provide: PROJECT_ADAPTERS.ids,
      useExisting: SequentialIdService,
    },
    ProjectSupportService,
    {
      provide: PROJECT_ADAPTERS.support,
      useExisting: ProjectSupportService,
    },
    ProjectLifecycleService,
    {
      provide: PROJECT_SERVICES.lifecycle,
      useExisting: ProjectLifecycleService,
    },
    PirService,
    {
      provide: PROJECT_SERVICES.pir,
      useExisting: PirService,
    },
    WeeklyLogService,
    {
      provide: PROJECT_SERVICES.weeklyLogs,
      useExisting: WeeklyLogService,
    },
    TestingService,
    {
      provide: PROJECT_SERVICES.testing,
      useExisting: TestingService,
    },
    SitProcessService,
    {
      provide: PROJECT_SERVICES.sit,
      useExisting: SitProcessService,
    },
    PhaseNoteService,
    {
      provide: PROJECT_SERVICES.phaseNotes,
      useExisting: PhaseNoteService,
    },

    // The facade the controller depends on.
    ProjectService,

    RolesGuard,
  ],
  exports: [ProjectService],
})
export class ProjectModule { }
