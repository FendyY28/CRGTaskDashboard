import {  
  Injectable, 
  ConflictException,
  UnauthorizedException,  
  NotFoundException, 
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus
} from '@nestjs/common';  
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto'; 
import * as bcrypt from 'bcrypt'; 
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';  
import { AuthMailerService } from './auth-mailer.service';  

@Injectable()
export class AuthService {
  /** Bcrypt hash of an arbitrary value, used to equalise login timing. */
  private static readonly DUMMY_PASSWORD_HASH =
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

  /** Failed-login throttle: max attempts per account before a temporary lockout. */
  private static readonly LOGIN_MAX_ATTEMPTS = 5;
  private static readonly LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

  /** email (lowercased) -> failed attempt count and the time the lockout ends. */
  private readonly failedLogins = new Map<string, { count: number; lockedUntil: number }>();

  /** Drop expired or stale entries so the map cannot grow without bound. */
  private pruneFailedLogins(now: number): void {
    if (this.failedLogins.size < 1000) return;
    for (const [key, entry] of this.failedLogins) {
      if (entry.lockedUntil !== 0 && entry.lockedUntil <= now) {
        this.failedLogins.delete(key);
      }
    }
  }

  /** Throws 429 while the account is locked out. */
  private assertNotLockedOut(email: string): void {
    const entry = this.failedLogins.get(email);
    if (!entry || entry.lockedUntil === 0) return;

    const now = Date.now();
    if (entry.lockedUntil > now) {
      const retryInMinutes = Math.ceil((entry.lockedUntil - now) / 60000);
      throw new HttpException(
        `Terlalu banyak percobaan login. Coba lagi dalam ${retryInMinutes} menit.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Lockout elapsed â€” start a fresh window.
    this.failedLogins.delete(email);
  }

  private recordFailedLogin(email: string): void {
    const now = Date.now();
    this.pruneFailedLogins(now);

    const entry = this.failedLogins.get(email) ?? { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= AuthService.LOGIN_MAX_ATTEMPTS) {
      entry.lockedUntil = now + AuthService.LOGIN_LOCKOUT_MS;
      entry.count = 0;
    }
    this.failedLogins.set(email, entry);
  }

  private clearFailedLogins(email: string): void {
    this.failedLogins.delete(email);
  }

  constructor(
    private prisma: PrismaService,
    private mailer: AuthMailerService,
    private jwtService: JwtService
  ) {}

  /** Base URL frontend untuk link di email (fallback ke localhost untuk dev). */
  private getFrontendUrl(): string {
    return this.mailer.getFrontendUrl();
  }

  // 1. REGISTER (User mendaftar sendiri, akun menunggu verifikasi email)
  async register(data: RegisterDto) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Akun yang belum terverifikasi boleh mendaftar ulang: token baru saja
      // dikirim, jadi user yang kehilangan email pertama tetap bisa lanjut.
      // Akun yang sudah terverifikasi tidak boleh ditimpa.
      if (existing.isVerified) {
        throw new ConflictException('Email ini sudah terdaftar. Silakan login.');
      }
      await this.issueVerificationToken(existing);
      return { message: 'Email verifikasi telah dikirim ulang. Silakan cek email Anda.' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: hashedPassword,
        role: 'OFFICER',
        isVerified: false,
      },
    });

    await this.issueVerificationToken(user);

    return { message: 'Registrasi berhasil. Silakan cek email untuk verifikasi akun.' };
  }

  /** Generates a 3-minute verification link token and emails it to the user. */
  private async issueVerificationToken(user: { id: string; email: string; name: string }) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: token, verificationTokenExpiresAt: expiresAt },
    });

    const verificationLink = `${this.getFrontendUrl()}/verify-email?token=${token}`;
    await this.sendVerificationEmail(
      user.email,
      user.name,
      verificationLink,
      'Action Required: Activate Your Account',
    );
  }

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
  async login(data: LoginDto) {
    const email = (data.email ?? '').trim().toLowerCase();
    this.assertNotLockedOut(email);

    const user = await this.prisma.user.findUnique({ where: { email } });

    // Selalu jalankan bcrypt.compare, bahkan ketika email tidak terdaftar.
    // Tanpa ini, respons untuk email yang tidak ada kembali jauh lebih cepat
    // sehingga penyerang bisa memetakan email karyawan yang valid.
    const passwordMatches = await bcrypt.compare(
      data.password ?? '',
      user?.password ?? AuthService.DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      this.recordFailedLogin(email);
      throw new UnauthorizedException('Email atau password salah');
    }

    this.clearFailedLogins(email);

    if (!user.isVerified) {
      await this.issueVerificationToken(user);

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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        passwordChangedAt: user.passwordChangedAt
      }
    };
  }

  // 2.1 GET PROFILE (DENGAN TANGGAL GANTI PASSWORD ASLI DARI DB)
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordChangedAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    return user;
  }
  /** Generate a 6-digit OTP and store it with an expiry on the user. */
  private async issueOtp(
    user: { id: string; email: string; name: string },
    expiryMinutes: number,
    subject: string,
    intro: string,
    footerNote: string,
    heading: string,
  ) {
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + expiryMinutes);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: otp, verificationTokenExpiresAt: otpExpires },
    });

    await this.mailer.sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiryMinutes,
      subject,
      heading,
      intro,
      footerNote,
    });

    return { message: 'Kode OTP telah dikirim ke email Anda.' };
  }

  /**
   * Throws unless the user's stored OTP matches `otp` and has not expired.
   * Shared by the reset-password and change-password flows so the rules live
   * in exactly one place.
   */
  private assertValidOtp(
    user: { verificationToken: string | null; verificationTokenExpiresAt: Date | null },
    otp: string | undefined | null,
  ): void {
    const now = new Date();
    if (
      !user.verificationToken ||
      user.verificationToken !== otp ||
      !user.verificationTokenExpiresAt ||
      now > user.verificationTokenExpiresAt
    ) {
      throw new BadRequestException('Kode OTP salah atau sudah kedaluwarsa.');
    }
  }

  // 3. FORGOT PASSWORD (KIRIM OTP)
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Jangan bocorkan apakah email terdaftar: respons selalu sama, email hanya
    // dikirim kalau user-nya benar-benar ada.
    if (!user) {
      return { message: 'Kode OTP telah dikirim ke email Anda.' };
    }

    return this.issueOtp(
      user,
      10,
      'Kode OTP Reset Password - BSI CRG',
      'Kami menerima permintaan untuk mereset password akun <b>BSI CRG Monitoring System</b> Anda. Masukkan kode berikut pada halaman reset password:',
      'Abaikan email ini jika Anda tidak merasa meminta reset password. Kode berlaku 10 menit dan hanya dapat digunakan satu kali.',
      'Reset Password Anda',
    );
  }

  // 4. RESET PASSWORD (VERIFIKASI OTP & SAVE NEW PASSWORD)
  async resetPassword(data: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    this.assertValidOtp(user, data.otp);

    await this.setNewPassword(user.id, user.email, user.name, data.password);

    return { message: 'Password berhasil diperbarui!' };
  }

  // 5. CHANGE PASSWORD STEP 1: REQUEST OTP
  async sendChangePasswordOTP(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    return this.issueOtp(
      user,
      5,
      'Kode Verifikasi Ganti Password - BSI CRG',
      'Gunakan kode berikut untuk memverifikasi permintaan ganti password akun <b>BSI CRG Monitoring System</b> Anda:',
      'Rahasiakan kode ini. Staf BSI CRG tidak akan pernah meminta kode OTP Anda.',
      'Verifikasi Ganti Password',
    );
  }

  // 6. CHANGE PASSWORD STEP 2: VERIFY OTP & UPDATE
  async changePassword(userId: string, data: ChangePasswordDto) {
    const { oldPassword, newPassword, otp } = data;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    this.assertValidOtp(user, otp);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new BadRequestException('Password saat ini salah.');

    if (newPassword === 'Bsi12345!') {
      throw new BadRequestException('Tidak boleh menggunakan password default.');
    }

    await this.setNewPassword(user.id, user.email, user.name, newPassword);
    return { message: 'Password berhasil diubah!' };
  }

  // 8. ADMIN RESET PASSWORD (KIRIM PASSWORD ACAK KE EMAIL)
  async adminResetPassword(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const newRawPassword = this.generateRandomPassword(10);
    await this.setNewPassword(user.id, user.email, user.name, newRawPassword);

    await this.mailer.sendTemporaryPasswordEmail({
      to: user.email,
      name: user.name,
      password: newRawPassword,
      subject: 'Kredensial Baru Akun BSI CRG',
      heading: 'Kredensial Baru Akun Anda',
      intro:
        'Administrator telah mengatur ulang password akun <b>BSI CRG Monitoring System</b> Anda. Gunakan kredensial sementara berikut untuk masuk:',
      note: 'Demi keamanan, segera ganti password ini melalui menu Pengaturan Profil setelah Anda masuk.',
      buttonText: 'Masuk Sekarang',
    });

    return { success: true, message: 'Password baru telah dikirim ke email.' };
  }

  /**
   * Hash `rawPassword`, store it on the user, clear any pending OTP and send
   * the security notification. Every password-changing flow goes through here
   * so none of them can forget the notification or the token cleanup.
   */
  private async setNewPassword(userId: string, email: string, name: string, rawPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        verificationToken: null,
        verificationTokenExpiresAt: null
      },
    });

    await this.sendPasswordChangedNotification(email, name);
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
    await this.mailer.sendVerificationEmail(to, name, link, subject);
  }

  /**
   * Email sent when an admin creates an account: shows the generated email and
   * temporary password using the same branded shell as the other emails.
   */
  public async sendWelcomeEmail(to: string, name: string, temporaryPassword: string) {
    await this.mailer.sendWelcomeEmail(to, name, temporaryPassword);
  }

  public async sendPasswordChangedNotification(to: string, name: string) {
    await this.mailer.sendPasswordChangedNotification(to, name);
  }
}
