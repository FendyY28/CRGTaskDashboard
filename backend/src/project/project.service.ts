import { Inject, Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  AddLogDto,
  CreateImprovementDto,
  CreateIssueDto,
  CreateSitProcessDto,
  CreateTestCaseDto,
  ReplaceSitProcessesDto,
  UpdateIssueDto,
  UpdateLogDto,
  UpdateSitProcessDto,
  UpdateTestCaseDto,
} from './dto/project-payloads.dto';
import { PhaseNoteService } from './phase-note.service';
import { PirService } from './pir.service';
import { ProjectLifecycleService } from './project-lifecycle.service';
import { SitProcessService } from './sit-process.service';
import { TestingService } from './testing.service';
import { WeeklyLogService } from './weekly-log.service';
import { PROJECT_SERVICES } from './project.tokens';

/**
 * Facade over the project domain.
 *
 * The controller talks to this one injected service; each method simply routes
 * to the single-responsibility service that owns the concern:
 *
 * | concern                            | service                  |
 * |------------------------------------|--------------------------|
 * | create/read/update/delete, cycles  | ProjectLifecycleService  |
 * | issues & improvement notes (PIR)   | PirService               |
 * | weekly logs & checklist tasks      | WeeklyLogService         |
 * | test cases & defects               | TestingService           |
 * | SIT process pipeline               | SitProcessService        |
 * | SDLC phase notes                   | PhaseNoteService         |
 *
 * Keeping the routing here means the HTTP layer never has to know how the
 * domain is partitioned, so services can be split or merged without touching
 * any controller.
 */
@Injectable()
export class ProjectService {
  constructor(
    @Inject(PROJECT_SERVICES.lifecycle) private readonly lifecycle: ProjectLifecycleService,
    @Inject(PROJECT_SERVICES.pir) private readonly pir: PirService,
    @Inject(PROJECT_SERVICES.weeklyLogs) private readonly weeklyLogs: WeeklyLogService,
    @Inject(PROJECT_SERVICES.testing) private readonly testing: TestingService,
    @Inject(PROJECT_SERVICES.sit) private readonly sit: SitProcessService,
    @Inject(PROJECT_SERVICES.phaseNotes) private readonly phaseNotes: PhaseNoteService,
  ) { }

  // 1. Project CRUD & cycle management -------------------------------------

  findAll() {
    return this.lifecycle.findAll();
  }

  findOne(id: string) {
    return this.lifecycle.findOne(id);
  }

  create(data: CreateProjectDto, userId: string) {
    return this.lifecycle.create(data, userId);
  }

  update(id: string, data: UpdateProjectDto, userId: string) {
    return this.lifecycle.update(id, data, userId);
  }

  remove(id: string, userId: string) {
    return this.lifecycle.remove(id, userId);
  }

  nextCycle(id: string, userId: string, body?: { targetPhase?: string }) {
    return this.lifecycle.nextCycle(id, userId, body);
  }

  // 2. PIR — issues & improvements -----------------------------------------

  findAllIssues() {
    return this.pir.findAllIssues();
  }

  createIssue(data: CreateIssueDto, userId: string) {
    return this.pir.createIssue(data, userId);
  }

  updateIssue(id: number, data: UpdateIssueDto, userId: string) {
    return this.pir.updateIssue(id, data, userId);
  }

  removeIssue(id: number, userId: string) {
    return this.pir.removeIssue(id, userId);
  }

  createImprovement(data: CreateImprovementDto, userId: string) {
    return this.pir.createImprovement(data, userId);
  }

  removeImprovement(id: number, userId: string) {
    return this.pir.removeImprovement(id, userId);
  }

  // 3. Weekly progress logs & tasks ----------------------------------------

  addLog(data: AddLogDto, userId: string) {
    return this.weeklyLogs.addLog(data, userId);
  }

  updateLog(weeklyId: number, data: UpdateLogDto, userId: string) {
    return this.weeklyLogs.updateLog(weeklyId, data, userId);
  }

  removeLog(id: number, userId: string) {
    return this.weeklyLogs.removeLog(id, userId);
  }

  addTask(weeklyProgressId: number, taskName: string, userId: string, description?: string) {
    return this.weeklyLogs.addTask(weeklyProgressId, taskName, userId, description);
  }

  toggleTask(taskId: number, userId: string) {
    return this.weeklyLogs.toggleTask(taskId, userId);
  }

  removeTask(taskId: number, userId: string) {
    return this.weeklyLogs.removeTask(taskId, userId);
  }

  // 4. Testing — test cases & defects --------------------------------------

  getTestingStatus() {
    return this.testing.getTestingStatus();
  }

  getTestCases(projectId: string) {
    return this.testing.getTestCases(projectId);
  }

  createTestCase(data: CreateTestCaseDto, userId: string) {
    return this.testing.createTestCase(data, userId);
  }

  updateTestCase(id: string, data: UpdateTestCaseDto, userId: string) {
    return this.testing.updateTestCase(id, data, userId);
  }

  deleteTestCase(id: string, userId: string) {
    return this.testing.deleteTestCase(id, userId);
  }

  // 5. SIT process pipeline ------------------------------------------------

  getSitProcesses(projectId: string) {
    return this.sit.getSitProcesses(projectId);
  }

  createSitProcess(data: CreateSitProcessDto, userId: string) {
    return this.sit.createSitProcess(data, userId);
  }

  updateSitProcess(id: string, data: UpdateSitProcessDto, projectId: string, userId: string) {
    return this.sit.updateSitProcess(id, data, projectId, userId);
  }

  deleteSitProcess(id: string, projectId: string, userId: string) {
    return this.sit.deleteSitProcess(id, projectId, userId);
  }

  replaceSitProcesses(data: ReplaceSitProcessesDto, userId: string) {
    return this.sit.replaceSitProcesses(data, userId);
  }

  // 6. SDLC phase notes ----------------------------------------------------

  addPhaseNote(phaseId: number, content: string, userId: string) {
    return this.phaseNotes.addPhaseNote(phaseId, content, userId);
  }

  getPhaseNotes(phaseId: number) {
    return this.phaseNotes.getPhaseNotes(phaseId);
  }

  deletePhaseNote(noteId: number, userId: string) {
    return this.phaseNotes.deletePhaseNote(noteId, userId);
  }
}
