import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private authService: AuthService,
  ) {}

  // List users without password fields.
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role ?? 'OFFICER',
        isVerified: true, // Karena dibuat oleh Admin
        passwordChangedAt: new Date(), // Set expired agar user wajib ganti saat pertama login
      },
    });

    // Email the credentials; a mail failure must not roll back the user.
    try {
        await this.authService.sendWelcomeEmail(newUser.email, newUser.name, rawPassword);
    } catch (error) {
        console.error("Gagal mengirim email welcome:", error);
    }

    const { password, ...result } = newUser;
    return result;
  }

  // Update role only; name and email stay immutable.
  async update(id: string, updateData: Pick<CreateUserDto, 'role'>) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        role: updateData.role,
      },
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  // Admin-triggered password reset.
  async resetPassword(id: string) {
    return this.authService.adminResetPassword(id);
  }

  // Permanently delete a user.
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan atau sudah dihapus.');

    try {
      await this.prisma.user.delete({ where: { id } });
      return { message: 'User berhasil dihapus permanen' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        // Blocked by an audit log still referencing this user (FK constraint).
        throw new ConflictException(
          'User tidak dapat dihapus karena masih memiliki riwayat audit log. Nonaktifkan akun ini sebagai gantinya.',
        );
      }
      throw error;
    }
  }
}