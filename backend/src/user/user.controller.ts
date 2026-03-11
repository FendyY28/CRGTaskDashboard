import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Delete, 
  Param, 
  UseGuards, 
  Patch 
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@Controller('users') 
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 1. Ambil Semua User
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  // 2. Buat User Baru
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // 3. Update Profil (Edit)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: Partial<CreateUserDto>) {
    return this.userService.update(id, updateUserDto);
  }

  // 4. Reset Password ke Default
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.userService.resetPassword(id);
  }

  // 5. Toggle Suspend/Active
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  toggleStatus(@Param('id') id: string) {
    return this.userService.toggleStatus(id);
  }

  // 6. Hapus User Permanen
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}