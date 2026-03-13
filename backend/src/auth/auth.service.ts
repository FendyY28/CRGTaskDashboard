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

  // 1. VERIFY EMAIL (Aktivasi Akun Baru)
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

  // 2. LOGIN (DENGAN PENGECEKAN KEDALUWARSA 6 BULAN)
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

    // CEK EXPIRED (6 BULAN)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Jika passwordChangedAt lebih lama dari 6 bulan lalu, lempar error
    if (user.passwordChangedAt && user.passwordChangedAt < sixMonthsAgo) {
      throw new ForbiddenException('PASSWORD_EXPIRED'); 
    }

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const realToken = this.jwtService.sign(payload);

    return {
      message: 'Login berhasil',
      access_token: realToken, 
      user: { id: user.id, email: user.email, role: user.role, name: user.name }
    };
  }

  // 3. FORGOT PASSWORD (MINTA OTP)
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
      subject: '🔐 Kode OTP Reset Password - BSI CRG',
      html: this.getPremiumTemplate(
        user.name, 
        `Anda meminta untuk mereset password Anda. Berikut adalah kode OTP Anda: <br><br> <span style="font-size: 32px; font-weight: bold; color: #36A39D; letter-spacing: 5px;">${otp}</span>`, 
        "#", 
        "Gunakan Kode di Aplikasi",
        "⚠️ Abaikan email ini jika Anda tidak merasa meminta reset password. Kode berlaku 10 menit."
      ),
    });

    return { message: 'Kode OTP telah dikirim ke email Anda.' };
  }

  // 4. RESET PASSWORD (VERIFIKASI OTP & SAVE NEW PASSWORD)
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

  // 5. CHANGE PASSWORD STEP 1: REQUEST OTP
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
      subject: '🔐 Kode Verifikasi Ganti Password - BSI CRG',
      html: this.getPremiumTemplate(
        user.name,
        `Kode verifikasi Anda untuk mengganti password adalah: <br><br> <span style="font-size: 32px; font-weight: bold; color: #36A39D; letter-spacing: 5px;">${otp}</span>`,
        "#", 
        "Gunakan Kode di Aplikasi",
        "⚠️ Rahasiakan kode ini."
      ),
    });

    return { message: 'Kode OTP telah dikirim ke email Anda.' };
  }

  // 6. CHANGE PASSWORD STEP 2: VERIFY OTP & UPDATE
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

    if (newPassword === 'Bsi12345!') {
      throw new BadRequestException('Tidak boleh menggunakan password default.');
    }

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

  // 8. ADMIN RESET PASSWORD (KIRIM PASSWORD ACAK KE EMAIL)
  async adminResetPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const newRawPassword = this.generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(newRawPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date(), 
        verificationToken: null,
        verificationTokenExpiresAt: null
      },
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: '🔐 Kredensial Baru Akun BSI CRG',
      html: this.getPremiumTemplate(
        user.name,
        `Administrator telah mengatur ulang password Anda. Gunakan kredensial sementara berikut untuk masuk:<br><br>
         <div style="background: #f0fdfa; border: 1px dashed #36A39D; padding: 15px; font-size: 24px; font-family: monospace; font-weight: bold; color: #36A39D; letter-spacing: 2px; text-align: center;">
           ${newRawPassword}
         </div>`,
        "http://localhost:5173/login", 
        "Masuk Sekarang",
        "🛡️ Demi keamanan, Anda dapat mengganti password ini kapan saja melalui menu Pengaturan Profil."
      ),
    });

    return { success: true, message: 'Password baru telah dikirim ke email.' };
  }

  // 7. HELPERS: PASSWORD & EMAIL TEMPLATES
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
        "⏳ Penting: Link ini hangus dalam 3 menit."
      ),
    });
  }

  public async sendPasswordChangedNotification(to: string, name: string) {
    const dateStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    await this.mailerService.sendMail({
      to: to,
      subject: '🛡️ Notifikasi Keamanan: Password Berhasil Diubah',
      html: this.getPremiumTemplate(
        name,
        `Kami ingin menginformasikan bahwa password akun BSI CRG Anda baru saja diubah pada <b>${dateStr} WIB</b>.<br><br>Jika ini adalah Anda, tidak ada tindakan lebih lanjut yang diperlukan.`,
        "http://localhost:5173/login", 
        "Masuk ke Akun Anda",
        "🚨 PENTING: Jika Anda tidak merasa mengubah password, segera hubungi Administrator IT."
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