import { Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';

/** bcrypt cost factor, shared by every password hash in the application. */
export const BCRYPT_ROUNDS = 10;

/**
 * Creation of a login identity for an admin-provisioned account: generate a
 * strong temporary password, store its hash and deliver the credentials.
 *
 * Kept separate from UserService so user administration (list / role / delete)
 * does not carry password policy, hashing and email concerns with it.
 */
@Injectable()
export class UserCredentialsService {
  private readonly logger = new Logger(UserCredentialsService.name);

  constructor(@Inject(AuthService) private readonly authService: AuthService) { }

  /** Hash a raw password with the application-wide bcrypt cost. */
  hashPassword(rawPassword: string): Promise<string> {
    return bcrypt.hash(rawPassword, BCRYPT_ROUNDS);
  }

  /**
   * Email the freshly generated credentials. A mail failure must not roll back
   * (or fail) the account creation: the admin can always re-send from the UI.
   */
  async deliverWelcomeCredentials(to: string, name: string, rawPassword: string): Promise<void> {
    try {
      await this.authService.sendWelcomeEmail(to, name, rawPassword);
    } catch (error) {
      this.logger.error(
        `Gagal mengirim email welcome ke ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
