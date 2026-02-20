import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailVerifierService } from '../common/email-verifier.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailVerifierService,
  ) {}

  @Post('register')
  async register(@Body() data: any) {
    const isReal = await this.emailService.verify(data.email); 
    
    if (!isReal) {
      throw new BadRequestException('Email tidak aktif. Gunakan email asli.');
    }
    
    return this.authService.register(data);
  }

  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }
  
  @Post('login')
  async login(@Body() data: any) {
    return this.authService.login(data);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    // Memanggil fungsi forgotPassword yang baru kita buat di AuthService
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
    async resetPassword(@Body() data: any) {
    return this.authService.resetPassword(data);
  }
}