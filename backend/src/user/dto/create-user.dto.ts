import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ROLES, type Role } from '../../auth/roles.decorator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama wajib diisi.' })
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email!: string;

  /**
   * Accepted for backwards compatibility but never used: the service always
   * generates a random temporary password and emails it to the new user.
   */
  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsIn(ROLES, { message: 'Role harus salah satu dari: ADMIN, OFFICER, HEAD.' })
  role?: Role;
}

/** PATCH /users/:id hanya boleh mengubah role. */
export class UpdateUserDto {
  @IsIn(ROLES, { message: 'Role harus salah satu dari: ADMIN, OFFICER, HEAD.' })
  role!: Role;
}