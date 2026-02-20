import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Ini membuat PrismaService bisa dipakai di mana saja tanpa import berulang kali
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Wajib diekspor agar bisa dipakai Module lain
})
export class PrismaModule {}