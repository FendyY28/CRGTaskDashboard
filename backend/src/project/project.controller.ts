import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  AddLogDto,
  AddPhaseNoteDto,
  AddTaskDto,
  CreateImprovementDto,
  CreateIssueDto,
  CreateSitProcessDto,
  CreateTestCaseDto,
  NextCycleDto,
  ReplaceSitProcessesDto,
  UpdateIssueDto,
  UpdateLogDto,
  UpdateSitProcessDto,
  UpdateTestCaseDto,
} from './dto/project-payloads.dto';

/** Routes that need a login and an ADMIN/OFFICER role. */
const AdminOrOfficer = () => UseGuards(JwtAuthGuard, RolesGuard);

/**
 * Thin HTTP layer for the project domain.
 *
 * Every writing route is guarded and takes the actor from the JWT through
 * @CurrentUserId(); body-supplied identity fields are dropped by the global
 * ValidationPipe (`whitelist: true`), so the audit trail cannot be forged.
 * All logic lives in ProjectService and the services behind it.
 */
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // 1. GENERAL & DASHBOARD ENDPOINTS
  @Get()
  findAll() {
    return this.projectService.findAll();
  }

  @Post()
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  create(@Body() data: CreateProjectDto, @CurrentUserId() userId: string) {
    return this.projectService.create(data, userId);
  }

  @Get('testing-status')
  getTestingStatus() {
    return this.projectService.getTestingStatus();
  }

  // 2. PIR (ISSUES & IMPROVEMENTS)
  @Get('issue')
  findAllIssues() {
    return this.projectService.findAllIssues();
  }

  @Post('issue')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  createIssue(@Body() data: CreateIssueDto, @CurrentUserId() userId: string) {
    return this.projectService.createIssue(data, userId);
  }

  @Patch('issue/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  updateIssue(
    @Param('id') id: string,
    @Body() data: UpdateIssueDto,
    @CurrentUserId() userId: string,
  ) {
    return this.projectService.updateIssue(+id, data, userId);
  }

  @Delete('issue/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  removeIssue(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.projectService.removeIssue(+id, userId);
  }

  @Post('improvement')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  createImprovement(@Body() data: CreateImprovementDto, @CurrentUserId() userId: string) {
    return this.projectService.createImprovement(data, userId);
  }

  @Delete('improvement/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  removeImprovement(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.projectService.removeImprovement(+id, userId);
  }

  // 3. LOGS & TASKS ENDPOINTS
  @Post('log')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  addLog(@Body() logData: AddLogDto, @CurrentUserId() userId: string) {
    return this.projectService.addLog(logData, userId);
  }

  @Delete('log/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  deleteLog(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.projectService.removeLog(+id, userId);
  }

  @Patch('log/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  updateLog(
    @Param('id') id: string,
    @Body() updateData: UpdateLogDto,
    @CurrentUserId() userId: string,
  ) {
    return this.projectService.updateLog(+id, updateData, userId);
  }

  @Post('log/:id/task')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  addTask(@Param('id') id: string, @Body() body: AddTaskDto, @CurrentUserId() userId: string) {
    return this.projectService.addTask(+id, body.taskName, userId, body.description);
  }

  @Patch('task/:id/toggle')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  toggleTask(@Param('id') id: string, @CurrentUserId() userId: string) {
    // completedBy sengaja TIDAK diterima dari body: service mengisinya dari user
    // yang terautentikasi agar atribusi pekerjaan tidak bisa dipalsukan.
    return this.projectService.toggleTask(+id, userId);
  }

  @Delete('task/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  removeTask(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.projectService.removeTask(+id, userId);
  }

  // 4. TEST CASES ENDPOINTS
  @Post('test-cases')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  createTestCase(@Body() data: CreateTestCaseDto, @CurrentUserId() userId: string) {
    return this.projectService.createTestCase(data, userId);
  }

  @Patch('test-cases/:testCaseId')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  updateTestCase(
    @Param('testCaseId') testCaseId: string,
    @Body() data: UpdateTestCaseDto,
    @CurrentUserId() userId: string,
  ) {
    return this.projectService.updateTestCase(testCaseId, data, userId);
  }

  @Delete('test-cases/:testCaseId')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  deleteTestCase(@Param('testCaseId') testCaseId: string, @CurrentUserId() userId: string) {
    return this.projectService.deleteTestCase(testCaseId, userId);
  }

  // 4b. SIT PROCESS PIPELINE ENDPOINTS
  @Get(':id/sit-processes')
  @UseGuards(JwtAuthGuard)
  getSitProcesses(@Param('id') projectId: string) {
    return this.projectService.getSitProcesses(projectId);
  }

  @Post('sit-processes')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  createSitProcess(@Body() data: CreateSitProcessDto, @CurrentUserId() userId: string) {
    return this.projectService.createSitProcess(data, userId);
  }

  @Patch('sit-processes/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  updateSitProcess(
    @Param('id') id: string,
    @Body() data: UpdateSitProcessDto,
    @Query('projectId') projectId: string,
    @CurrentUserId() userId: string,
  ) {
    if (!projectId) throw new BadRequestException('Query projectId wajib diisi.');
    return this.projectService.updateSitProcess(id, data, projectId, userId);
  }

  @Delete('sit-processes/:id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  deleteSitProcess(
    @Param('id') id: string,
    @Query('projectId') projectId: string,
    @CurrentUserId() userId: string,
  ) {
    if (!projectId) throw new BadRequestException('Query projectId wajib diisi.');
    return this.projectService.deleteSitProcess(id, projectId, userId);
  }

  @Put('sit-processes')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  replaceSitProcesses(@Body() data: ReplaceSitProcessesDto, @CurrentUserId() userId: string) {
    return this.projectService.replaceSitProcesses(data, userId);
  }

  // 5. PARAMETERIZED ROUTES
  @Get(':id/test-cases')
  getTestCases(@Param('id') projectId: string) {
    return this.projectService.getTestCases(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  update(
    @Param('id') id: string,
    @Body() data: UpdateProjectDto,
    @CurrentUserId() userId: string,
  ) {
    return this.projectService.update(id, data, userId);
  }

  @Delete(':id')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.projectService.remove(id, userId);
  }

  // 6. CYCLE MANAGEMENT
  @Post(':id/next-cycle')
  @AdminOrOfficer()
  @Roles('ADMIN')
  nextCycle(
    @Param('id') id: string,
    @Body() body: NextCycleDto,
    @CurrentUserId() userId: string,
  ) {
    return this.projectService.nextCycle(id, userId, body);
  }

  // 7. PHASE NOTES ENDPOINTS
  @Post('phase/:phaseId/note')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  addPhaseNote(
    @Param('phaseId') phaseId: string,
    @Body() body: AddPhaseNoteDto,
    @CurrentUserId() userId: string,
  ) {
    return this.projectService.addPhaseNote(parseInt(phaseId, 10), body.content, userId);
  }

  @Get('phase/:phaseId/notes')
  @UseGuards(JwtAuthGuard)
  getPhaseNotes(@Param('phaseId') phaseId: string) {
    return this.projectService.getPhaseNotes(parseInt(phaseId, 10));
  }

  @Delete('phase/note/:noteId')
  @AdminOrOfficer()
  @Roles('ADMIN', 'OFFICER')
  deletePhaseNote(@Param('noteId') noteId: string, @CurrentUserId() userId: string) {
    return this.projectService.deletePhaseNote(parseInt(noteId, 10), userId);
  }
}
