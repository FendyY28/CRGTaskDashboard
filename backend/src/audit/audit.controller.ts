import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  // GET /audit — All logs with multi-filter query params
  @Get()
  async getLogs(
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLogs({ projectId, userId, action, search, startDate, endDate, page: page ? +page : undefined, limit: limit ? +limit : undefined });
  }

  // GET /audit/project/:projectId — Logs for specific project
  @Get('project/:projectId')
  async getProjectLogs(@Param('projectId') projectId: string, @Query('limit') limit?: string) {
    return this.auditService.getLogsByProject(projectId, limit ? +limit : 50);
  }

  // GET /audit/meta/options — Dropdown options for filters (users + action types)
  @Get('meta/options')
  async getMetaOptions() {
    return this.auditService.getFilterOptions();
  }
}