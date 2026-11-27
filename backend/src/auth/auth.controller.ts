import { 
  Controller, 
  Get,
  Post, 
  Patch,  
  Body, 
  Param,
  UseGuards, 
  BadRequestException 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailVerifierService } from '../common/email-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { CurrentUserId } from './current-user.decorator';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ValidateEmailDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailVerifierService,
  ) {}

  // Check that an email address is reachable (Abstract API).
  @Post('validate-email')
  async validateEmail(@Body() body: ValidateEmailDto) {
    const isValid = await this.emailService.verify(body.email);
    if (!isValid) throw new BadRequestException('Email tidak aktif atau tidak valid.');
    return { success: true };
  }

  // Self-service signup: creates an unverified account and emails a link.
  @Post('register')
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  // Activate an account from the emailed token.
  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  // Current user, read from the DB (not from client-cached localStorage).
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUserId() userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('login')
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  // Send a password-reset OTP to the user's email.
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  // Finish a self-service reset using the OTP.
  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }

  // Authenticated change-password flow, step 1: request the OTP.
  @UseGuards(JwtAuthGuard)
  @Post('request-change-password-otp')
  async requestChangePasswordOtp(@CurrentUserId() userId: string) {
    return this.authService.sendChangePasswordOTP(userId);
  }

  // Step 2: apply the new password with the OTP.
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@CurrentUserId() userId: string, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(userId, body);
  }

  // Admin resets another user's password (random password emailed).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/admin-reset-password')
  async adminResetPassword(@Param('id') id: string) {
    return this.authService.adminResetPassword(id);
  }
}