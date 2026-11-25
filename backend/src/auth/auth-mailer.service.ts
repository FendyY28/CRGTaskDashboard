import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

/**
 * Owns everything about outbound auth email: the SMTP/dev fallback switch, the
 * shared branded HTML shell and the individual transactional messages.
 *
 * Split out of AuthService so authentication logic and email presentation can
 * change (and be tested) independently.
 */
@Injectable()
export class AuthMailerService {
  constructor(private mailerService: MailerService) {}

  /**
   * True when SMTP is not configured (MAIL_USER/MAIL_PASS empty or still the
   * .env.example placeholders). Emails are then logged to the console instead
   * of being sent, so local dev works without a Gmail app password.
   */
  isMailConfigured(): boolean {
    const user = process.env.MAIL_USER ?? '';
    const pass = process.env.MAIL_PASS ?? '';
    if (!user || !pass) return false;
    return !user.includes('your_email') && !pass.includes('your_gmail_app_password');
  }

  /** Sends a mail, or logs it when SMTP is not configured. */
  async deliverMail(payload: { to: string; subject: string; html?: string; text?: string }) {
    if (!this.isMailConfigured()) {
      console.warn(
        `[MAIL] SMTP belum dikonfigurasi (MAIL_USER/MAIL_PASS kosong) - email tidak dikirim.\n` +
          `       to      : ${payload.to}\n` +
          `       subject : ${payload.subject}\n` +
          `       body    : ${payload.text ?? String(payload.html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`,
      );
      return;
    }

    await this.mailerService.sendMail(payload);
  }

  /** Base URL frontend untuk link di email (fallback ke localhost untuk dev). */
  getFrontendUrl(): string {
    return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  }

  /** OTP / temporary-password email built from the shared branded shell. */
  async sendOtpEmail(params: {
    to: string;
    name: string;
    otp: string;
    expiryMinutes: number;
    subject: string;
    heading: string;
    intro: string;
    footerNote: string;
  }): Promise<void> {
    const { to, name, otp, expiryMinutes, subject, heading, intro, footerNote } = params;

    await this.deliverMail({
      to,
      subject,
      text: `Kode OTP Anda: ${otp} (berlaku ${expiryMinutes} menit)`,
      html: this.getPremiumTemplate({
        heading,
        name,
        body: `
          ${this.getParagraph(intro)}
          ${this.getOtpBlock(otp, expiryMinutes)}
        `,
        note: footerNote,
        noteTone: 'warning',
        footerContext: `Dikirim ke ${to}`,
      }),
    });
  }

  /** Email carrying an admin-generated temporary password. */
  async sendTemporaryPasswordEmail(params: {
    to: string;
    name: string;
    password: string;
    subject: string;
    heading: string;
    intro: string;
    note: string;
    buttonText?: string;
  }): Promise<void> {
    const { to, name, password, subject, heading, intro, note, buttonText = 'Masuk ke Aplikasi' } = params;

    await this.deliverMail({
      to,
      subject,
      text: `Password sementara Anda: ${password}`,
      html: this.getPremiumTemplate({
        heading,
        name,
        body: `
          ${this.getParagraph(intro)}
          ${this.getOtpBlock(password, null, 'Password sementara', to)}
        `,
        button: {
          text: buttonText,
          url: `${this.getFrontendUrl()}/login`,
        },
        note,
        noteTone: 'warning',
        footerContext: `Dikirim ke ${to}`,
      }),
    });
  }

  public async sendVerificationEmail(to: string, name: string, link: string, subject: string) {
    await this.deliverMail({
      text: `Aktifkan akun Anda: ${link}`,
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
    await this.sendTemporaryPasswordEmail({
      to,
      name,
      password: temporaryPassword,
      subject: 'Selamat Datang di BSI CRG - Kredensial Akun',
      heading: 'Akun Anda Sudah Siap',
      intro:
        'Akun <b>BSI CRG Monitoring System</b> Anda telah dibuat oleh Administrator. Gunakan kredensial sementara berikut untuk masuk:',
      note: 'Harap segera ganti password Anda setelah masuk melalui menu Pengaturan Profil.',
    });
  }

  public async sendPasswordChangedNotification(to: string, name: string) {
    const dateStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    await this.deliverMail({
      text: `Password akun ${to} berhasil diubah pada ${dateStr} WIB.`,
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
  getParagraph(text: string): string {
    return `<p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: #4B5563; text-align: left;">${text}</p>`;
  }

  /**
   * Monospace, high-contrast code card used for OTPs and temporary passwords.
   * Built with a real `<table>` so Outlook (which ignores flex/inline-block
   * centering) still renders it correctly.
   */
  getOtpBlock(code: string, expiryMinutes: number | null, label = 'Kode OTP', email?: string): string {
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
  getPremiumTemplate(options: {
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
