import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Password policy shared by every flow that sets a password.
 * Kept intentionally modest (8 chars) so existing seeded/admin-generated
 * passwords keep working, while still rejecting trivial input.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt only considers the first 72 bytes

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class ValidateEmailDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email!: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Token verifikasi wajib diisi.' })
  @MaxLength(128)
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode OTP wajib diisi.' })
  @MaxLength(8)
  otp!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password saat ini wajib diisi.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  oldPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password baru minimal ${PASSWORD_MIN_LENGTH} karakter.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode OTP wajib diisi.' })
  @MaxLength(8)
  otp!: string;
}
