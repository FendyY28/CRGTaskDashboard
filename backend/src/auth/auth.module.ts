import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailVerifierService } from '../common/email-verifier.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PrismaModule, 
    PassportModule,
    JwtModule.register({
      secret: 'BSI_CRG_SECRET_KEY_2026',
      signOptions: { expiresIn: '1d' },
    }),
  ], 
  controllers: [AuthController],
  providers: [
    AuthService, 
    EmailVerifierService,
    JwtStrategy 
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}