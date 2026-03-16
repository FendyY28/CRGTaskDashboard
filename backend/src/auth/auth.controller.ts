import { 
  Controller, 
  Post, 
  Patch, 
  Body, 
  Req, 
  Param,
  UseGuards, 
  BadRequestException 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailVerifierService } from '../common/email-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailVerifierService,
  ) {}

  // 1. Validasi Email (Cek aktif/tidaknya email via Abstract API)
  @Post('validate-email')
  async validateEmail(@Body('email') email: string) {
    const isValid = await this.emailService.verify(email); 
    if (!isValid) throw new BadRequestException('Email tidak aktif atau tidak valid.');
    return { success: true };
  }

  // 2. Verifikasi Email (Aktivasi akun via link email)
  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }
  
  // 3. Login Utama
  @Post('login')
  async login(@Body() data: any) {
    return this.authService.login(data);
  }

  // 4. Lupa Password (Mandiri - Kirim kode OTP ke email)
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  // 5. Reset Password (Mandiri - Eksekusi perubahan via OTP)
  @Post('reset-password')
  async resetPassword(@Body() data: any) {
    return this.authService.resetPassword(data);
  }

  // FITUR GANTI PASSWORD DENGAN VERIFIKASI OTP (SECURE)

  // 6. Minta Kode OTP (Langkah pertama sebelum ganti password)
  @UseGuards(JwtAuthGuard)
  @Post('request-change-password-otp')
  async requestChangePasswordOtp(@Req() req) {
    // req.user.id didapat dari JWT Strategy
    const userId = req.user.id;
    return this.authService.sendChangePasswordOTP(userId);
  }

  // 7. Eksekusi Ganti Password (Langkah kedua, kirim password & OTP)
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@Req() req, @Body() body: any) {
    const userId = req.user.id; 
    // Body wajib berisi: { oldPassword, newPassword, otp }
    return this.authService.changePassword(userId, body);
  }

  // 8. ADMIN RESET PASSWORD (KHUSUS MANAGEMENT USER)
  // Endpoint ini dipanggil ketika Admin melakukan reset dari dashboard.
  // Akan men-generate password acak dan mengirimnya via email.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/admin-reset-password')
  async adminResetPassword(@Param('id') id: string) {
    return this.authService.adminResetPassword(id);
  }

  // 9. Konfirmasi Admin Reset (User klik link dari email)
  // 🚨 TIDAK pakai @UseGuards karena dieksekusi dari link luar
  @Post('confirm-admin-reset')
  async confirmAdminReset(@Body('token') token: string) {
    if (!token) throw new BadRequestException('Token tidak ditemukan.');
    return this.authService.confirmAdminResetPassword(token);
  }
}