import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { MailerModule } from '@nestjs-modules/mailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ProjectModule } from './project/project.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module'; // 👈 Import file sudah ada

@Module({
  imports: [
    // 1. Konfigurasi Global Environment Variables
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    // 2. Konfigurasi Mailer
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: 587, 
          secure: false, 
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
          family: 4, // IPv4 Force
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false, 
          },
          debug: true, 
          logger: true 
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
    AuditModule // 👈 WAJIB DITAMBAHKAN DI SINI!
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}