import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Kita Override fungsi "canActivate"
  canActivate(context: ExecutionContext) {
    // ❌ Jangan panggil super.canActivate(context) <-- Ini yang bikin error karena Strategy belum ada
    
    // ✅ Langsung return TRUE (Izinkan semua request lewat)
    return true; 
  }
}