import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailVerifierService } from '../common/email-verifier.service';
import { JwtModule } from '@nestjs/jwt'; // ✅ Tambahkan ini
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PrismaModule, 
    PassportModule,
    // 🛡️ KONFIGURASI JWT (Wajib ada agar JwtService bisa bekerja)
    JwtModule.register({
      secret: 'BSI_CRG_SECRET_KEY_2026', // Gunakan secret key yang kuat
      signOptions: { expiresIn: '1d' },   // Token berlaku 1 hari
    }),
  ], 
  controllers: [AuthController],
  providers: [
    AuthService, 
    EmailVerifierService 
  ],
  exports: [AuthService, JwtModule], // ✅ Export agar module lain bisa validasi token
})
export class AuthModule {}