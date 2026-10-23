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
    // Global env vars.
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Global rate limit (100 req/min per IP); sensitive auth routes use stricter @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // SMTP transport for transactional email.
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: 587,
          secure: false, // true only for port 465
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: `"BSI CRG Monitoring" <${config.get('MAIL_FROM')}>`,
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules.
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
    // Rate limiting applies to every route unless explicitly skipped.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}