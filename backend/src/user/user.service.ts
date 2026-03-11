import { Injectable, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // 1. GET ALL USERS
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        // isActive: true, // Tambahkan ini jika di schema.prisma ada field isActive
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 2. CREATE USER (Oleh Admin)
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email ini sudah terdaftar!');
    }

    const rawPassword = createUserDto.password || 'Bsi12345!'; 
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role as any,
      },
    });

    const { password, ...result } = newUser;
    return result;
  }

  // 3. UPDATE USER PROFILE (Aksi Edit)
  async update(id: string, updateData: Partial<CreateUserDto>) {
    // Cek apakah user ada
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    // Jika email diubah, cek apakah email baru sudah dipakai orang lain
    if (updateData.email && updateData.email !== user.email) {
      const emailCheck = await this.prisma.user.findUnique({ where: { email: updateData.email } });
      if (emailCheck) throw new ConflictException('Email sudah digunakan oleh pengguna lain.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: updateData.name,
        email: updateData.email,
        role: updateData.role as any,
      },
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  // 4. RESET PASSWORD (Ke Default: Bsi12345!)
  async resetPassword(id: string) {
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Bsi12345!', salt);

    try {
      await this.prisma.user.update({
        where: { id },
        data: { password: defaultPassword },
      });
      return { message: 'Password berhasil direset ke default: Bsi12345!' };
    } catch (error) {
      throw new NotFoundException('Gagal meriset password. User tidak ditemukan.');
    }
  }

  // 5. SUSPEND / NONAKTIFKAN USER
  async toggleStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    return { message: 'Status user berhasil diperbarui.' };
  }

  // 6. REMOVE / DELETE PERMANENT
  async remove(id: string) {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return { message: 'User berhasil dihapus permanen' };
    } catch (error) {
      throw new NotFoundException('User tidak ditemukan atau sudah dihapus.');
    }
  }
}