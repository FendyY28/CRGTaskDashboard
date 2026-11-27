import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserCredentialsService } from './user-credentials.service';

/** Columns the API may expose for a user; never the password hash. */
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/**
 * User administration: listing, creating, changing roles and removing
 * accounts. Credential handling (hashing, delivery) is delegated to
 * UserCredentialsService.
 */
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: UserCredentialsService,
    private readonly authService: AuthService,
  ) {}

  // List users without password fields.
  async findAll() {
    return this.prisma.user.findMany({
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Create a user with a generated password and email it.
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email ini sudah terdaftar!');
    }

    const rawPassword = this.authService.generateRandomPassword(10);

    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: await this.credentials.hashPassword(rawPassword),
        role: createUserDto.role ?? 'OFFICER',
        isVerified: true, // Karena dibuat oleh Admin
        passwordChangedAt: new Date(), // Set expired agar user wajib ganti saat pertama login
      },
    });

    await this.credentials.deliverWelcomeCredentials(newUser.email, newUser.name, rawPassword);
    return this.withoutPassword(newUser);
  }

  // Update role only; name and email stay immutable.
  async update(id: string, updateData: Pick<CreateUserDto, 'role'>) {
    await this.findOrThrow(id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: updateData.role },
    });
    return this.withoutPassword(updatedUser);
  }

  // Admin-triggered password reset.
  async resetPassword(id: string) {
    return this.authService.adminResetPassword(id);
  }

  // Permanently delete a user.
  async remove(id: string) {
    await this.findOrThrow(id, 'User tidak ditemukan atau sudah dihapus.');

    try {
      await this.prisma.user.delete({ where: { id } });
      return { message: 'User berhasil dihapus permanen' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        // Blocked by an audit log still referencing this user (FK constraint).
        throw new ConflictException(
          'User tidak dapat dihapus karena masih memiliki riwayat audit log. Nonaktifkan akun ini sebagai gantinya.',
        );
      }
      throw error;
    }
  }

  private async findOrThrow(id: string, message = 'User tidak ditemukan.') {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(message);
    return user;
  }

  /** Drop the password hash before a user record leaves the service. */
  private withoutPassword<T extends { password: string }>(user: T): Omit<T, 'password'> {
    const { password: _password, ...rest } = user;
    return rest;
  }
}
