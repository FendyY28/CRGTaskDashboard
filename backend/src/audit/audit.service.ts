import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string, action: string, details: string) {
    try {
      // 1. Cek apakah User ID valid/ada di database
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      // 2. Jika user TIDAK ADA, kita skip audit log (daripada server crash)
      if (!user) {
        console.warn(`⚠️ [AUDIT WARNING] User ID '${userId}' tidak ditemukan. Log dilewati agar server tidak crash.`);
        return; 
      }

      // 3. Jika user ADA, simpan log dengan aman
      await this.prisma.auditLog.create({
        data: {
          userId,
          userName: user.name,
          action,
          details,
        },
      });

    } catch (error) {
      // 4. Tangkap error apapun agar tidak mematikan server
      console.error("❌ [AUDIT ERROR] Gagal menyimpan log:", error.message);
      // Kita telan errornya (tidak throw) agar proses utama (Create Project) tetap jalan sukses.
    }
  }

  async getRecentLogs() {
    return this.prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  }
}