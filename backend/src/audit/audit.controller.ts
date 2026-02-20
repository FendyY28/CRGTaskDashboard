import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async getLogs() {
    return this.auditService.getRecentLogs();
  }
}