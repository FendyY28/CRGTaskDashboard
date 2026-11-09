import {  
  Injectable, 
  UnauthorizedException, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus
} from '@nestjs/common';  
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto'; 
import * as bcrypt from 'bcrypt'; 
import { ChangePasswordDto, LoginDto, ResetPasswordDto } from './dto/auth.dto'; 

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

    // Lockout elapsed — start a fresh window.
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
    private mailerService: MailerService,
    private jwtService: JwtService
  ) {}

  /** Base URL frontend untuk link di email (fallback ke localhost untuk dev). */
  private getFrontendUrl(): string {
    return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
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
    const throttleKey = (data.email ?? '').trim().toLowerCase();
    this.assertNotLockedOut(throttleKey);

    const user = await this.prisma.user.findUnique({ where: { email: data.email } });

    // Selalu jalankan bcrypt.compare, bahkan ketika email tidak terdaftar.
    // Tanpa ini, respons untuk email yang tidak ada kembali jauh lebih cepat
    // sehingga penyerang bisa memetakan email karyawan yang valid.
    const passwordMatches = await bcrypt.compare(
      data.password ?? '',
      user?.password ?? AuthService.DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      this.recordFailedLogin(throttleKey);
      throw new UnauthorizedException('Email atau password salah');
    }

    this.clearFailedLogins(throttleKey);

    if (!user.isVerified) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 3);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: token, verificationTokenExpiresAt: expiresAt },
      });

      const verificationLink = `${this.getFrontendUrl()}/verify-email?token=${token}`;
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

    await this.mailerService.sendMail({
      to: user.email,
      subject,
      html: this.getPremiumTemplate({
        heading,
        name: user.name,
        body: `
          ${this.getParagraph(intro)}
          ${this.getOtpBlock(otp, expiryMinutes)}
        `,
        note: footerNote,
        noteTone: 'warning',
        footerContext: `Dikirim ke ${user.email}`,
      }),
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

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Kredensial Baru Akun BSI CRG',
      html: this.getPremiumTemplate({
        heading: 'Kredensial Baru Akun Anda',
        name: user.name,
        body: `
          ${this.getParagraph('Administrator telah mengatur ulang password akun <b>BSI CRG Monitoring System</b> Anda. Gunakan kredensial sementara berikut untuk masuk:')}
          ${this.getOtpBlock(newRawPassword, null, 'Password sementara', user.email)}
        `,
        button: {
          text: 'Masuk Sekarang',
          url: `${this.getFrontendUrl()}/login`,
        },
        note: 'Demi keamanan, segera ganti password ini melalui menu Pengaturan Profil setelah Anda masuk.',
        noteTone: 'warning',
        footerContext: `Dikirim ke ${user.email}`,
      }),
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
    await this.mailerService.sendMail({
      to: to,
      subject: subject,
      html: this.getPremiumTemplate({
        heading: 'Verifikasi Email Anda',
        name,
        body: this.getParagraph(
          'Terima kasih telah bergabung dengan <b>BSI CRG Monitoring System</b>. Klik tombol di bawah ini untuk mengaktifkan akun dan mulai menggunakan dashboard.',
        ),
        button: {
          text: 'Verifikasi Akun Saya',
          url: link,
        },
        note: 'Link verifikasi hanya berlaku 3 menit. Jika tombol tidak berfungsi, salin tautan di bawah ini ke browser Anda.',
        noteTone: 'warning',
        fallbackLink: link,
        footerContext: `Dikirim ke ${to}`,
      }),
    });
  }

  /**
   * Email sent when an admin creates an account: shows the generated email and
   * temporary password using the same branded shell as the other emails.
   */
  public async sendWelcomeEmail(to: string, name: string, temporaryPassword: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Selamat Datang di BSI CRG - Kredensial Akun',
      html: this.getPremiumTemplate({
        heading: 'Akun Anda Sudah Siap',
        name,
        body: `
          ${this.getParagraph(
            'Akun <b>BSI CRG Monitoring System</b> Anda telah dibuat oleh Administrator. Gunakan kredensial sementara berikut untuk masuk:',
          )}
          ${this.getOtpBlock(temporaryPassword, null, 'Password sementara', to)}
        `,
        button: {
          text: 'Masuk ke Aplikasi',
          url: `${this.getFrontendUrl()}/login`,
        },
        note: 'Harap segera ganti password Anda setelah masuk melalui menu Pengaturan Profil.',
        noteTone: 'warning',
        footerContext: `Dikirim ke ${to}`,
      }),
    });
  }

  public async sendPasswordChangedNotification(to: string, name: string) {
    const dateStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    await this.mailerService.sendMail({
      to: to,
      subject: 'Notifikasi Keamanan: Password Berhasil Diubah',
      html: this.getPremiumTemplate({
        heading: 'Password Anda Telah Diubah',
        name,
        body: `
          ${this.getParagraph(
            'Kami ingin menginformasikan bahwa password akun <b>BSI CRG Monitoring System</b> Anda baru saja diubah. Jika ini adalah Anda, tidak ada tindakan lebih lanjut yang diperlukan.',
          )}
          ${this.getInfoRows([
            { label: 'Waktu perubahan', value: `${dateStr} WIB` },
            { label: 'Akun', value: to },
          ])}
        `,
        button: {
          text: 'Masuk ke Akun Anda',
          url: `${this.getFrontendUrl()}/login`,
        },
        note: 'Jika Anda tidak merasa mengubah password, segera hubungi Administrator IT — akun Anda mungkin telah diakses pihak lain.',
        noteTone: 'danger',
        footerContext: `Dikirim ke ${to}`,
      }),
    });
  }

  /** One-line paragraph with consistent spacing across clients. */
  protected getParagraph(text: string): string {
    return `<p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: #4B5563; text-align: left;">${text}</p>`;
  }

  /**
   * Monospace, high-contrast code card used for OTPs and temporary passwords.
   * Built with a real `<table>` so Outlook (which ignores flex/inline-block
   * centering) still renders it correctly.
   */
  protected getOtpBlock(code: string, expiryMinutes: number | null, label = 'Kode OTP', email?: string): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 22px;">
        <tr>
          <td align="center" style="background-color: #F0FDFA; border: 1px solid #CCEEE9; border-radius: 14px; padding: 22px 16px;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #38A79C; margin-bottom: 10px;">${label}</div>
            <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: ${code.length > 6 ? '3px' : '8px'}; color: #0F766E; line-height: 40px;">${code}</div>
            ${expiryMinutes ? `<div style="font-size: 12px; color: #6B7280; margin-top: 10px;">Berlaku selama ${expiryMinutes} menit</div>` : ''}
          </td>
        </tr>
      </table>
      ${email ? this.getInfoRows([{ label: 'Email', value: email }]) : ''}
    `;
  }

  /** Definition list rendered as table rows (label left, value right). */
  private getInfoRows(rows: { label: string; value: string }[]): string {
    const cells = rows
      .map(
        (row) => `
        <tr>
          <td style="padding: 10px 0; font-size: 13px; color: #6B7280; border-bottom: 1px solid #F1F5F9;">${row.label}</td>
          <td align="right" style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #1F2937; border-bottom: 1px solid #F1F5F9;">${row.value}</td>
        </tr>`,
      )
      .join('');

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 22px; background-color: #F8FAFC; border-radius: 12px;">
        <tr><td style="padding: 6px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cells}</table>
        </td></tr>
      </table>
    `;
  }

  /**
   * Shared shell for every transactional email: brand header, greeting,
   * caller-supplied body, optional CTA button, tone-aware note and footer.
   * Inline CSS + table layout only, because Gmail/Outlook strip <style> blocks.
   */
  protected getPremiumTemplate(options: {
    heading: string;
    name: string;
    body: string;
    button?: { text: string; url: string };
    note?: string;
    noteTone?: 'warning' | 'danger' | 'info';
    fallbackLink?: string;
    footerContext?: string;
  }): string {
    const { heading, name, body, button, note, noteTone = 'info', fallbackLink, footerContext } = options;
    const year = new Date().getFullYear();

    const tones = {
      warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
      danger: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
      info: { bg: '#F0FDFA', border: '#CCEEE9', text: '#0F766E' },
    } as const;
    const tone = tones[noteTone];

    const buttonHtml = button
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 4px auto 26px;">
          <tr>
            <td align="center" bgcolor="#38A79C" style="border-radius: 12px; box-shadow: 0 6px 16px rgba(56,167,156,0.28);">
              <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px;">${button.text}</a>
            </td>
          </tr>
        </table>`
      : '';

    const noteHtml = note
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 26px;">
          <tr>
            <td style="background-color: ${tone.bg}; border: 1px solid ${tone.border}; border-left: 4px solid ${tone.border}; border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 20px; color: ${tone.text};">${note}</td>
          </tr>
        </table>`
      : '';

    const fallbackHtml = fallbackLink
      ? `
        <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #9CA3AF; text-align: left;">Atau salin tautan ini</p>
        <p style="margin: 0 0 24px; font-size: 12px; line-height: 18px; color: #38A79C; word-break: break-all; text-align: left;">
          <a href="${fallbackLink}" target="_blank" style="color: #38A79C; text-decoration: underline;">${fallbackLink}</a>
        </p>`
      : '';

    return `
<div style="margin: 0; padding: 0; background-color: #EEF2F6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EEF2F6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08);">

          <!-- Brand header -->
          <tr>
            <td style="background-color: #38A79C; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 700; color: #FFFFFF; line-height: 22px;">BSI</div>
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.85); margin-top: 3px;">Bank Syariah Indonesia</div>
                  </td>
                  <td align="right" style="vertical-align: middle; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.9);">
                    CRG&nbsp;Monitoring
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height: 4px; background-color: #F8AD3C; line-height: 4px; font-size: 0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 36px 8px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #38A79C;">Halo, ${name}</p>
              <h1 style="margin: 0 0 18px; font-size: 22px; line-height: 30px; font-weight: 700; color: #111827;">${heading}</h1>
              ${body}
              ${buttonHtml}
              ${noteHtml}
              ${fallbackHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E5E7EB; padding: 22px 36px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 4px; font-size: 12px; line-height: 18px; color: #6B7280;">Email otomatis dari CRG Monitoring System. Mohon jangan membalas email ini.</p>
              ${footerContext ? `<p style="margin: 0 0 10px; font-size: 12px; line-height: 18px; color: #9CA3AF;">${footerContext}</p>` : ''}
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">© ${year} Bank Syariah Indonesia — CRG Monitoring System</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>
    `;
  }
}