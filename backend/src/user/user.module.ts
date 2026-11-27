import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserCredentialsService } from './user-credentials.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserCredentialsService, RolesGuard],
  exports: [UserService],
})
export class UserModule {}