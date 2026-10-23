import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Delete, 
  Param, 
  UseGuards, 
  Patch,
  Request,
  BadRequestException
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Seluruh endpoint manajemen user adalah ADMIN-only. Guard di level kelas
// memastikan setiap route baru otomatis ikut terkunci.
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 1. Ambil Semua User (Admin Only View)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  // 2. Buat User Baru
  // Password akan di-generate otomatis di Service dan dikirim ke email
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // 3. Update Profil User
  // Identitas (Nama/Email) dikunci di Service, hanya Role yang bisa diubah
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  // 4. Reset Password User
  // Memicu pembuatan password acak baru dan pengiriman via email
  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.userService.resetPassword(id);
  }

  // 5. Hapus User Permanen
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    // Admin tidak boleh menghapus akunnya sendiri — mencegah lockout tak sengaja.
    if (req.user?.id === id) {
      throw new BadRequestException('Anda tidak dapat menghapus akun Anda sendiri.');
    }
    return this.userService.remove(id);
  }
}