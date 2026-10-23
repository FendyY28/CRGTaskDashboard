import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailVerifierService } from '../common/email-verifier.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    PrismaModule,
    ConfigModule
  ],
  controllers: [ProjectController],
  providers: [
    ProjectService,
    EmailVerifierService,
    AuditService,
    RolesGuard
  ],
})
export class ProjectModule {}