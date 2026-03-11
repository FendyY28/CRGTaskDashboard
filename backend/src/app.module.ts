import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
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

    // 2. Konfigurasi Mailer
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'), // smtp.gmail.com
          port: 587, 
          secure: false, // Port 587 wajib false, nanti naik ke TLS via STARTTLS
          auth: {
            user: config.get('MAIL_USER'), // fendymagang@gmail.com
            pass: config.get('MAIL_PASS'), // qhebrthvwyzldejy (App Password)
          },
          tls: {
            // Mengizinkan pengiriman meskipun sertifikat lokal tidak divalidasi
            rejectUnauthorized: false, 
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
  providers: [AppService, PrismaService],
})
export class AppModule {}