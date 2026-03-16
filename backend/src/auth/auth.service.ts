import { 
  Injectable, 
  UnauthorizedException, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException 
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
    private jwtService: JwtService
  ) {}

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) throw new BadRequestException('Token tidak valid atau sudah digunakan.');

    const now = new Date();
    if (!user.verificationTokenExpiresAt || now > user.verificationTokenExpiresAt) {
      throw new BadRequestException('Token sudah kedaluwarsa. Silakan minta admin untuk mengirim ulang atau coba login.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationTokenExpiresAt: null },
    });

    return { message: 'Email berhasil diverifikasi! Silakan login.' };
  }

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

    const expirationDate = new Date(user.passwordChangedAt);
    expirationDate.setMonth(expirationDate.getMonth() + 6);

    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration <= 0) {
      throw new ForbiddenException('PASSWORD_EXPIRED'); 
    }

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const realToken = this.jwtService.sign(payload);

    return {
      message: 'Login berhasil',
      access_token: realToken, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.name,
        daysUntilExpiration,
        passwordChangedAt: user.passwordChangedAt
      }
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Email tidak terdaftar.');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10); 

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: otp, verificationTokenExpiresAt: otpExpires },
    });

    await this.mailerService.sendMail({
      to: email,
      subject: 'Kode OTP Reset Password - BSI CRG',
      html: this.getPremiumTemplate(
        user.name, 
        `Anda meminta untuk mereset password Anda. Berikut adalah kode OTP Anda: <br><br> <span style="font-size: 32px; font-weight: bold; color: #36A39D; letter-spacing: 5px;">${otp}</span>`, 
        "#", 
        "Gunakan Kode di Aplikasi",
        "Abaikan email ini jika Anda tidak merasa meminta reset password. Kode berlaku 10 menit."
      ),
    });

    return { message: 'Kode OTP telah dikirim ke email Anda.' };
  }

  async resetPassword(data: any) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const now = new Date();
    if (
      !user.verificationToken || 
      user.verificationToken !== data.otp || 
      !user.verificationTokenExpiresAt || 
      now > user.verificationTokenExpiresAt
    ) {
      throw new BadRequestException('Kode OTP salah atau sudah kedaluwarsa.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { email: data.email },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date(),
        verificationToken: null, 
        verificationTokenExpiresAt: null
      }, 
    });

    await this.sendPasswordChangedNotification(updatedUser.email, updatedUser.name);

    return { message: 'Password berhasil diperbarui!' };
  }

  async sendChangePasswordOTP(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 5); 

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        verificationToken: otp, 
        verificationTokenExpiresAt: otpExpires 
      },
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Kode Verifikasi Ganti Password - BSI CRG',
      html: this.getPremiumTemplate(
        user.name,
        `Kode verifikasi Anda untuk mengganti password adalah: <br><br> <span style="font-size: 32px; font-weight: bold; color: #36A39D; letter-spacing: 5px;">${otp}</span>`,
        "#", 
        "Gunakan Kode di Aplikasi",
        "Rahasiakan kode ini."
      ),
    });

    return { message: 'Kode OTP telah dikirim ke email Anda.' };
  }

  async changePassword(userId: string, data: any) {
    const { oldPassword, newPassword, otp } = data;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const now = new Date();
    if (
      !user.verificationToken || 
      user.verificationToken !== otp || 
      !user.verificationTokenExpiresAt || 
      now > user.verificationTokenExpiresAt
    ) {
      throw new BadRequestException('Kode OTP salah atau sudah kedaluwarsa.');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new BadRequestException('Password saat ini salah.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date(),
        verificationToken: null, 
        verificationTokenExpiresAt: null
      },
    });

    await this.sendPasswordChangedNotification(user.email, user.name);
    return { message: 'Password berhasil diubah!' };
  }

  async adminResetPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); 

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        verificationToken: token,
        verificationTokenExpiresAt: expiresAt
      },
    });

    const confirmLink = `http://localhost:5173/confirm-reset?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Konfirmasi Reset Password Akun BSI CRG',
      html: this.getPremiumTemplate(
        user.name,
        `Administrator baru saja meminta reset password untuk akun Anda. Jika Anda menyetujuinya, silakan klik tombol di bawah ini.`,
        confirmLink, 
        "Konfirmasi & Reset Password",
        "PENTING: Jika Anda tidak merasa meminta atau tidak menyetujui reset ini, abaikan email ini. Link berlaku selama 24 jam."
      ),
    });

    return { success: true, message: 'Email konfirmasi reset telah dikirim ke user.' };
  }

  async confirmAdminResetPassword(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) throw new BadRequestException('Token tidak valid atau sudah digunakan.');

    const now = new Date();
    if (!user.verificationTokenExpiresAt || now > user.verificationTokenExpiresAt) {
      throw new BadRequestException('Token reset password sudah kedaluwarsa. Silakan minta admin mereset ulang.');
    }

    const newRawPassword = this.generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(newRawPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date(), 
        verificationToken: null,
        verificationTokenExpiresAt: null
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ADMIN_RESET_PASSWORD',
        details: 'User confirmed admin password reset',
        userName: user.name,
        userId: user.id
      }
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Kredensial Baru Akun BSI CRG',
      html: this.getPremiumTemplate(
        user.name,
        `Anda telah menyetujui permintaan reset password. Gunakan kredensial sementara berikut untuk masuk:<br><br>
         <div style="background: #f0fdfa; border: 1px dashed #36A39D; padding: 15px; font-size: 24px; font-family: monospace; font-weight: bold; color: #36A39D; letter-spacing: 2px; text-align: center;"><b>${newRawPassword}</b></div>`,
        "http://localhost:5173/login", 
        "Masuk Sekarang",
        "Demi keamanan, kami menyarankan Anda untuk segera mengganti password ini setelah berhasil masuk."
      ),
    });

    return { success: true, message: 'Password baru berhasil dibuat dan dikirim ke email.' };
  }

  public generateRandomPassword(length = 10): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset.charAt(randomIndex);
    }
    return password;
  }

  public async sendVerificationEmail(to: string, name: string, link: string, subject: string) {
    await this.mailerService.sendMail({
      to: to,
      subject: subject,
      html: this.getPremiumTemplate(
        name,
        "Terima kasih telah bergabung. Silakan klik tombol di bawah ini untuk mengaktifkan akun Anda.",
        link,
        "Verifikasi Akun Saya",
        "Penting: Link ini hangus dalam 3 menit."
      ),
    });
  }

  public async sendPasswordChangedNotification(to: string, name: string) {
    const dateStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    await this.mailerService.sendMail({
      to: to,
      subject: 'Notifikasi Keamanan: Password Berhasil Diubah',
      html: this.getPremiumTemplate(
        name,
        `Kami ingin menginformasikan bahwa password akun BSI CRG Anda baru saja diubah pada <b>${dateStr} WIB</b>.<br><br>Jika ini adalah Anda, tidak ada tindakan lebih lanjut yang diperlukan.`,
        "http://localhost:5173/login", 
        "Masuk ke Akun Anda",
        "PENTING: Jika Anda tidak merasa mengubah password, segera hubungi Administrator IT."
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
            <div style="font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 15px;">Hi, ${name}</div>
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