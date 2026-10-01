import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ProjectModule } from './project/project.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    // 1. Konfigurasi Global Environment Variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Rate limiting global (default 100 req / 60 detik per IP).
    // Endpoint auth yang sensitif memakai limit yang lebih ketat lewat @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // 2. Konfigurasi Mailer
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'), // smtp.gmail.com
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'), // App Password (16 karakter, tanpa spasi)
          },
        },
        defaults: {
          from: `"BSI CRG Monitoring" <${config.get('MAIL_FROM')}>`,
        },
      }),
      inject: [ConfigService],
    }),

    // 3. Module Internal Lainnya
    ProjectModule,
    PrismaModule,
    AuthModule,
    AuditModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // Guard ini otomatis aktif untuk semua route (kecuali yang di-skip)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}