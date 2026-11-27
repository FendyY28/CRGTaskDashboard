import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateTestCaseDto, UpdateTestCaseDto } from './dto/project-payloads.dto';
import type { AuditLogger, ProjectDatabase } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';
import type { ProjectSupportService } from './project-support.service';

/**
 * QA testing: test cases and the defect attached to a failing one.
 *
 * Invariant enforced here: a test case in the `fail` state always has a defect
 * description, and moving back to pass/pending clears the stale defect. Both
 * writes happen in one transaction so the two cannot drift apart.
 */
@Injectable()
export class TestingService {
  constructor(
    @Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase,
    @Inject(PROJECT_ADAPTERS.audit) private readonly audit: AuditLogger,
    @Inject(PROJECT_ADAPTERS.support) private readonly support: ProjectSupportService,
  ) { }

  async getTestingStatus() {
    return this.db.project.findMany({
      select: {
        id: true,
        name: true,
        currentPhase: true,
        testCases: { include: { defect: true } },
      },
    });
  }

  async getTestCases(projectId: string) {
    return this.db.testCase.findMany({
      where: { projectId },
      include: { defect: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTestCase(data: CreateTestCaseDto, userId: string) {
    const userName = await this.support.resolveUserName(userId);

    const testCase = await this.db.testCase.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        type: data.type,
        notes: data.notes,
        status: 'pending',
        updatedBy: userName, // Set pembuat sebagai updater pertama
      },
    });
    await this.audit.log(
      userId,
      'CREATE_TEST_CASE',
      `Membuat Test Case: ${data.title}`,
      data.projectId,
    );
    return testCase;
  }

  async updateTestCase(id: string, data: UpdateTestCaseDto, userId: string) {
    const { status, notes, defect, takeoutReason, isDeleted } = data;

    // Test case yang di-fail wajib punya defect: tanpa ini status 'fail' bisa
    // tersimpan tanpa catatan defect sama sekali.
    if (status === 'fail' && !defect?.description) {
      throw new BadRequestException('Deskripsi defect wajib diisi untuk test case yang gagal.');
    }

    const userName = await this.support.resolveUserName(userId);

    const testCase = await this.db.$transaction(async (tx) => {
      const updated = await tx.testCase.update({
        where: { id },
        data: { status, notes, takeoutReason, isDeleted, updatedBy: userName },
      });

      if (status === 'fail' && defect) {
        await tx.defect.upsert({
          where: { testCaseId: id },
          update: { description: defect.description, severity: defect.severity, status: 'open' },
          create: { testCaseId: id, description: defect.description, severity: defect.severity, status: 'open' },
        });
      } else if (status === 'pass' || status === 'pending') {
        await tx.defect.deleteMany({ where: { testCaseId: id } });
      }

      return updated;
    });

    await this.audit.log(
      userId,
      'UPDATE_TEST_CASE',
      `Update status Test Case menjadi ${status}`,
      testCase.projectId,
    );
    return testCase;
  }

  /** Soft delete: the row is flagged so the history and audit trail survive. */
  async deleteTestCase(id: string, userId: string) {
    const userName = await this.support.resolveUserName(userId);

    const testCase = await this.db.testCase.update({
      where: { id },
      data: { isDeleted: true, deletedBy: userName, deletedAt: new Date() },
    });

    await this.audit.log(
      userId,
      'TAKEOUT_TEST_CASE',
      `Melakukan Takeout pada Test Case: "${testCase.title}"`,
      testCase.projectId,
    );
    return testCase;
  }
}
