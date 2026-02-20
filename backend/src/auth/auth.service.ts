import { 
  Injectable, 
  ConflictException, 
  UnauthorizedException, 
  NotFoundException, 
  BadRequestException 
} from '@nestjs/common'; 
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto'; 
import * as bcrypt from 'bcrypt'; 

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private jwtService: JwtService // 👈 Inject JwtService
  ) {}

  // ==========================================================
  // 1. REGISTER
  // ==========================================================
  async register(data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('Email sudah terdaftar dan aktif. Silakan login.');
    }

    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3); 

    if (existingUser) {
      await this.prisma.user.update({
        where: { email: data.email },
        data: {
          name: data.name,
          password: hashedPassword,
          verificationToken: token,
          verificationTokenExpiresAt: expiresAt,
        },
      });
    } else {
      await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword, 
          role: 'OFFICER',
          isVerified: false,
          verificationToken: token,
          verificationTokenExpiresAt: expiresAt,
        },
      });
    }

    const verificationLink = `http://localhost:5173/verify-email?token=${token}`;
    await this.sendVerificationEmail(data.email, data.name, verificationLink, "Welcome to BSI CRG");

    return { message: 'Registrasi berhasil! Cek email Anda.' };
  }

  // ==========================================================
  // 2. VERIFY EMAIL
  // ==========================================================
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) throw new BadRequestException('Token tidak valid atau sudah digunakan.');

    const now = new Date();
    if (!user.verificationTokenExpiresAt || now > user.verificationTokenExpiresAt) {
      throw new BadRequestException('Token sudah kedaluwarsa. Silakan daftar ulang.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationTokenExpiresAt: null },
    });

    return { message: 'Email berhasil diverifikasi! Silakan login.' };
  }

  // ==========================================================
  // 3. LOGIN (DIPERBAIKI: TOKEN ASLI)
  // ==========================================================
  async login(data: any) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !await bcrypt.compare(data.password, user.password)) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (!user.isVerified) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 3);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: token, verificationTokenExpiresAt: expiresAt },
      });

      const verificationLink = `http://localhost:5173/verify-email?token=${token}`;
      await this.sendVerificationEmail(user.email, user.name, verificationLink, "Action Required: Activate Your Account");

      throw new UnauthorizedException('Akun belum aktif. Email verifikasi baru telah dikirim.');
    }

    // ✅ GENERATE TOKEN ASLI BERISI ID USER
    const payload = { sub: user.id, email: user.email, name: user.name };
    const realToken = this.jwtService.sign(payload);

    return {
      message: 'Login berhasil',
      access_token: realToken, // 👈 Token ini sekarang berisi ID User Anda!
      user: { email: user.email, role: user.role, name: user.name }
    };
  }

  // ... (forgotPassword, resetPassword, sendVerificationEmail, getPremiumTemplate tetap sama)

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Email tidak terdaftar.');

    const resetLink = `http://localhost:5173/reset-password?email=${email}`;

    await this.mailerService.sendMail({
      to: email,
      subject: '🔒 Reset Password Request - BSI CRG',
      html: this.getPremiumTemplate(
        user.name, 
        "Permintaan reset password diterima. Klik tombol di bawah ini:", 
        resetLink, 
        "Reset Password Sekarang",
        "⚠️ Abaikan jika Anda tidak merasa meminta reset password."
      ),
    });

    return { message: 'Link reset password telah dikirim ke email Anda.' };
  }

  async resetPassword(data: any) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await this.prisma.user.update({
      where: { email: data.email },
      data: { password: hashedPassword }, 
    });

    return { message: 'Password berhasil diperbarui!' };
  }

  private async sendVerificationEmail(to: string, name: string, link: string, subject: string) {
    await this.mailerService.sendMail({
      to: to,
      subject: subject,
      html: this.getPremiumTemplate(
        name,
        "Terima kasih telah bergabung. Silakan klik tombol di bawah ini untuk mengaktifkan akun Anda.",
        link,
        "Verifikasi Akun Saya",
        "⏳ Penting: Link ini hangus dalam 3 menit."
      ),
    });
  }

  private getPremiumTemplate(name: string, message: string, btnLink: string, btnText: string, warning: string) {
    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
        <div style="background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background-color: #36A39D; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Bank Syariah Indonesia</h1>
            <div style="color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; font-weight: bold;">CRG Monitoring System</div>
          </div>
          <div style="padding: 40px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 15px;">Hi, ${name} 👋</div>
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">${message}</p>
            <a href="${btnLink}" target="_blank" style="background-color: #F9AD3C; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 14px; display: inline-block;">${btnText}</a>
            <br><br>
            <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; font-size: 13px; color: #92400e; display: inline-block; margin-top: 20px;">${warning}</div>
          </div>
        </div>
      </div>
    `;
  }
}