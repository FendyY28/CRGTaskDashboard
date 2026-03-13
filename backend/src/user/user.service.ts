import { Injectable, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service'; 

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService, 
  ) {}

  // 1. GET ALL USERS
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

  // 2. CREATE USER (Generate Random Password & Kirim Email)
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email ini sudah terdaftar!');
    }

    // Generate password acak, bukan lagi 'Bsi12345!'
    const rawPassword = this.authService.generateRandomPassword(10);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role as any,
        isVerified: true, // Karena dibuat oleh Admin
        passwordChangedAt: new Date(), // Set expired agar user wajib ganti saat pertama login
      },
    });

    // Kirim Email Welcome berisi kredensial login
    try {
        await this.authService['mailerService'].sendMail({
            to: newUser.email,
            subject: '👋 Selamat Datang di BSI CRG - Kredensial Akun',
            html: this.authService['getPremiumTemplate'](
              newUser.name,
              `Akun Anda telah berhasil dibuat oleh Administrator. Berikut adalah kredensial login Anda:<br><br>
               <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: left;">
                 <b>Email:</b> ${newUser.email}<br>
                 <b>Password Sementara:</b> <span style="color: #36A39D; font-family: monospace; font-weight: bold;">${rawPassword}</span>
               </div>`,
              "http://localhost:5173/login",
              "Masuk ke Aplikasi",
              "🛡️ Harap segera ganti password Anda setelah masuk melalui menu Pengaturan Profil."
            ),
        });
    } catch (error) {
        console.error("Gagal mengirim email welcome:", error);
        // Tetap lanjutkan proses karena user sudah terbuat di DB
    }

    const { password, ...result } = newUser;
    return result;
  }

  // 3. UPDATE USER PROFILE (Hanya Role)
  async update(id: string, updateData: Partial<CreateUserDto>) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    // Kita hanya mengizinkan update Role demi keamanan identitas
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        role: updateData.role as any,
      },
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  // 4. RESET PASSWORD 
  async resetPassword(id: string) {
    return this.authService.adminResetPassword(id);
  }

  // 5. REMOVE / DELETE PERMANENT
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