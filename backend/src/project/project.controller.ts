import { 
  Controller, 
  Get, 
  Param, 
  Post, 
  Body, 
  Patch, 
  Delete, 
  BadRequestException, 
  Request, 
  UseGuards 
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { EmailVerifierService } from '../common/email-verifier.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  AddLogDto,
  AddPhaseNoteDto,
  AddTaskDto,
  CreateImprovementDto,
  CreateIssueDto,
  CreateTestCaseDto,
  NextCycleDto,
  UpdateIssueDto,
  UpdateLogDto,
  UpdateTestCaseDto,
} from './dto/project-payloads.dto';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly emailService: EmailVerifierService,
  ) {}

  /**
   * Identitas pelaku SELALU diambil dari JWT (req.user), tidak pernah dari body.
   * Body request dikendalikan klien, sehingga menerima userId/performedBy dari
   * sana membuat audit trail bisa dipalsukan oleh user mana pun.
   */
  private getUserId(req: any): string {
    if (req.user && (req.user.id || req.user.userId)) {
      return req.user.id || req.user.userId;
    }

    throw new BadRequestException("Sesi Anda tidak valid. Silakan Logout dan Login ulang.");
  }

  // 1. GENERAL & DASHBOARD ENDPOINTS
  @Get()
  findAll() {
    return this.projectService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async create(@Body() data: CreateProjectDto, @Request() req) {
    // Pelaku selalu dari JWT. Identitas kiriman client (userId/performedBy)
    // sudah dibuang oleh ValidationPipe `whitelist`, karena tidak ada di DTO.
    const userId = this.getUserId(req);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  createIssue(@Body() data: CreateIssueDto, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.createIssue(data, userId);
  }

  @Patch('issue/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  updateIssue(@Param('id') id: string, @Body() data: UpdateIssueDto, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.updateIssue(+id, data, userId);
  }

  @Delete('issue/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  removeIssue(@Param('id') id: string, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.removeIssue(+id, userId);
  }

  @Post('improvement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  createImprovement(@Body() data: CreateImprovementDto, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.createImprovement(data, userId);
  }

  @Delete('improvement/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  removeImprovement(@Param('id') id: string, @Request() req: any) {
     const userId = this.getUserId(req);
    return this.projectService.removeImprovement(+id, userId);
  }

  // 3. LOGS & TASKS ENDPOINTS
  @Post('log')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async addLog(@Body() logData: AddLogDto, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.addLog(logData, userId);
  }

  @Delete('log/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async deleteLog(@Param('id') id: string, @Request() req) {
    // Ambil userId (via token atau body jika dikirim)
    const userId = this.getUserId(req);

    // Panggil service
    return this.projectService.removeLog(+id, userId);
  }

  @Patch('log/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async updateLog(@Param('id') id: string, @Body() updateData: UpdateLogDto, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.updateLog(+id, updateData, userId);
  }

  @Post('log/:id/task')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async addTask(
    @Param('id') id: string,
    @Body() body: AddTaskDto,
    @Request() req
  ) {
    const userId = this.getUserId(req);
    return this.projectService.addTask(+id, body.taskName, userId, body.description);
  }

  @Patch('task/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async toggleTask(@Param('id') id: string, @Request() req) {
    const userId = this.getUserId(req);
    // completedBy sengaja TIDAK diterima dari body: service akan mengisinya
    // dari user yang terautentikasi agar atribusi pekerjaan tidak bisa dipalsukan.
    return this.projectService.toggleTask(+id, userId);
  }

  @Delete('task/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async removeTask(@Param('id') id: string, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.removeTask(+id, userId);
  }

  // 4. TEST CASES ENDPOINTS
  @Post('test-cases')
  @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OFFICER')
createTestCase(@Body() data: CreateTestCaseDto, @Request() req) {
  const userId = this.getUserId(req);
  return this.projectService.createTestCase(data, userId);
  }

  @Patch('test-cases/:testCaseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  updateTestCase(@Param('testCaseId') testCaseId: string, @Body() data: UpdateTestCaseDto, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.updateTestCase(testCaseId, data, userId);
  }

  @Delete('test-cases/:testCaseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  deleteTestCase(@Param('testCaseId') testCaseId: string, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.deleteTestCase(testCaseId, userId);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async update(@Param('id') id: string, @Body() data: UpdateProjectDto, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.update(id, data, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  remove(@Param('id') id: string, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.remove(id, userId);
  }

  // 6. CYCLE MANAGEMENT

  @Post(':id/next-cycle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
    async nextCycle(
      @Param('id') id: string,
      @Request() req,
      @Body() body: NextCycleDto
    ) {
      const userId = this.getUserId(req);
      return this.projectService.nextCycle(id, userId, body);
    }

  // 7. PHASE NOTES ENDPOINTS
  @Post('phase/:phaseId/note')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async addPhaseNote(
    @Param('phaseId') phaseId: string,
    @Body() body: AddPhaseNoteDto,
    @Request() req,
  ) {
    const userId = this.getUserId(req);
    return this.projectService.addPhaseNote(parseInt(phaseId), body.content, userId);
  }

  @Get('phase/:phaseId/notes')
  @UseGuards(JwtAuthGuard)
  async getPhaseNotes(@Param('phaseId') phaseId: string) {
    return this.projectService.getPhaseNotes(parseInt(phaseId));
  }

  @Delete('phase/note/:noteId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OFFICER')
  async deletePhaseNote(@Param('noteId') noteId: string, @Request() req) {
    const userId = this.getUserId(req);
    return this.projectService.deletePhaseNote(parseInt(noteId), userId);
  }
}