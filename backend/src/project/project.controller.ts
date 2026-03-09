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

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly emailService: EmailVerifierService,
  ) {}

  /**
   * =====================================================================
   * HELPER: DETEKSI USER SAKTI
   * =====================================================================
   * Logika:
   * 1. Cek apakah Frontend menitipkan ID lewat Body (performedBy)? -> PAKAI INI.
   * 2. Cek apakah ada Token Login (req.user)? -> Pakai ini.
   * 3. Kepepet? -> Pakai ID Hardcoded.
   */
  private getUserId(req: any, bodyData?: any): string {
    // 1. Cek Token JWT (Cara Paling Aman & Utama)
    if (req.user && (req.user.id || req.user.userId)) {
      return req.user.id || req.user.userId;
    }

    // 2. Fallback: Cek Body dari Frontend (jika frontend kirim userId)
    if (bodyData && bodyData.userId) {
       return bodyData.userId;
    }
    
    // 3. Fallback: Cek performedBy (Legacy)
    if (bodyData && bodyData.performedBy) {
       return bodyData.performedBy;
    }

    // ⛔ JANGAN PERNAH RETURN ID HARDCODED DI SINI
    // Lebih baik error daripada pakai ID yang tidak ada di DB
    console.error("❌ [SECURITY ALERT] User ID tidak ditemukan di Token maupun Body!");
    throw new BadRequestException("Sesi Anda tidak valid. Silakan Logout dan Login ulang.");
  }

  // ===========================================================================
  // 1. GENERAL & DASHBOARD ENDPOINTS
  // ===========================================================================

  @Get()
  findAll() {
    return this.projectService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard) 
  async create(@Body() data: any, @Request() req) {
    // 1. Deteksi Siapa Pelakunya
    const userId = this.getUserId(req, data);

    // 2. Bersihkan sampah "performedBy" agar Prisma tidak error
    delete data.performedBy;

    if (data.email) {
      const isReal = await this.emailService.verify(data.email);
      if (!isReal) throw new BadRequestException('Email tidak aktif/valid.');
    }

    return this.projectService.create(data, userId);
  }

  @Get('testing-status')
  getTestingStatus() {
    return this.projectService.getTestingStatus();
  }

  // ===========================================================================
  // 2. PIR (ISSUES & IMPROVEMENTS)
  // ===========================================================================

  @Get('issue')
  findAllIssues() {
    return this.projectService.findAllIssues();
  }

  @Post('issue')
  @UseGuards(JwtAuthGuard) 
  createIssue(@Body() data: any, @Request() req) {
    const userId = this.getUserId(req, data);
    delete data.performedBy;
    return this.projectService.createIssue(data, userId);
  }

  @Patch('issue/:id')
  @UseGuards(JwtAuthGuard) 
  updateIssue(@Param('id') id: string, @Body() data: any, @Request() req) {
    const userId = this.getUserId(req, data);
    delete data.performedBy;
    return this.projectService.updateIssue(+id, data, userId);
  }

  @Delete('issue/:id')
  @UseGuards(JwtAuthGuard) 
  removeIssue(@Param('id') id: string, @Request() req) {
    // Delete biasanya tidak bawa Body, jadi kita cek req.body manual jika ada
    const userId = this.getUserId(req, req.body);
    return this.projectService.removeIssue(+id, userId);
  }

  @Post('improvement')
  @UseGuards(JwtAuthGuard) 
  createImprovement(@Body() data: any, @Request() req) {
    const userId = this.getUserId(req, data);
    delete data.performedBy;
    return this.projectService.createImprovement(data, userId);
  }

  @Delete('improvement/:id')
  removeImprovement(@Param('id') id: string, @Request() req: any) {
     const userId = this.getUserId(req, req.body);
    return this.projectService.removeImprovement(+id, userId);
  }

  // ===========================================================================
  // 3. LOGS & TASKS ENDPOINTS
  // ===========================================================================

  @Post('log')
  @UseGuards(JwtAuthGuard) 
  async addLog(@Body() logData: any, @Request() req) {
    const userId = this.getUserId(req, logData);
    delete logData.performedBy;
    return this.projectService.addLog(logData, userId);
  }

  @Delete('log/:id')
  @UseGuards(JwtAuthGuard)
  async deleteLog(@Param('id') id: string, @Request() req) {
    // Ambil userId (via token atau body jika dikirim)
    const userId = this.getUserId(req, req.body); 
    
    // Panggil service
    return this.projectService.removeLog(+id, userId);
  }

  @Patch('log/:id')
  @UseGuards(JwtAuthGuard) 
  async updateLog(@Param('id') id: string, @Body() updateData: any, @Request() req) {
    const userId = this.getUserId(req, updateData);
    delete updateData.performedBy;
    return this.projectService.updateLog(+id, updateData, userId);
  }

  @Patch('task/:id/toggle')
  @UseGuards(JwtAuthGuard) 
  async toggleTask(@Param('id') id: string, @Request() req) {
    // Toggle task biasanya pakai logic khusus, kita ambil dari req.body jika frontend kirim
    const userId = this.getUserId(req, req.body);
    return this.projectService.toggleTask(+id, userId);
  }

  @Delete('task/:id')
  @UseGuards(JwtAuthGuard)
  async removeTask(@Param('id') id: string, @Request() req) {
    const userId = this.getUserId(req, req.body);
    return this.projectService.removeTask(+id, userId);
  }

  // ===========================================================================
  // 4. TEST CASES ENDPOINTS
  // ===========================================================================

  @Post('test-cases')
  @UseGuards(JwtAuthGuard) 
  createTestCase(@Body() data: any, @Request() req) {
    const userId = this.getUserId(req, data);
    
    // Bersihkan semua kemungkinan titipan frontend
    delete data.performedBy;
    delete data.userId; // <--- Tambahkan ini biar bersih
    
    return this.projectService.createTestCase(data, userId);
  }

  @Patch('test-cases/:testCaseId')
  @UseGuards(JwtAuthGuard) 
  updateTestCase(@Param('testCaseId') testCaseId: string, @Body() data: any, @Request() req) {
    const userId = this.getUserId(req, data);
    delete data.performedBy;
    return this.projectService.updateTestCase(testCaseId, data, userId);
  }

  @Delete('test-cases/:testCaseId')
  @UseGuards(JwtAuthGuard) 
  deleteTestCase(@Param('testCaseId') testCaseId: string, @Request() req) {
    const userId = this.getUserId(req, req.body);
    return this.projectService.deleteTestCase(testCaseId, userId);
  }

  // ===========================================================================
  // 5. PARAMETERIZED ROUTES
  // ===========================================================================

  @Get(':id/test-cases')
  getTestCases(@Param('id') projectId: string) {
    return this.projectService.getTestCases(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) 
  async update(@Param('id') id: string, @Body() data: any, @Request() req) {
    const userId = this.getUserId(req, data);
    
    // Bersihkan field yang tidak perlu
    delete data.performedBy;

    if (data.email) {
      const isReal = await this.emailService.verify(data.email);
      if (!isReal) throw new BadRequestException('Email baru tidak valid.');
    }

    return this.projectService.update(id, data, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) 
  remove(@Param('id') id: string, @Request() req) {
    // Untuk delete, frontend biasanya tidak kirim body. 
    // Jika masih hardcode, biarkan fallback bekerja.
    const userId = this.getUserId(req, req.body);
    return this.projectService.remove(id, userId);
  }

  // ===========================================================================
  // 6. CYCLE MANAGEMENT
  // ===========================================================================

  @Post(':id/next-cycle')
  @UseGuards(JwtAuthGuard)
    async nextCycle(
      @Param('id') id: string, 
      @Request() req,
      @Body() body?: { targetPhase?: string } // 🔥 TAMBAHKAN @Body() DI SINI
    ) {
      const userId = this.getUserId(req, body); // body dikirim ke helper juga untuk jaga-jaga
      return this.projectService.nextCycle(id, userId, body); // 🔥 LEMPAR body KE SERVICE
    }
}