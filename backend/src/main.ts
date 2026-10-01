import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const JWT_SECRET_PLACEHOLDERS = [
  'replace-with-a-long-random-secret',
  'your_password',
  'secret',
  'change-me',
];

function validateEnv(): void {
  const errors: string[] = [];

  const jwtSecret = (process.env.JWT_SECRET ?? '').trim();
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required but was not set.');
  } else if (
    jwtSecret.length < 32 ||
    JWT_SECRET_PLACEHOLDERS.some((p) => jwtSecret.toLowerCase().includes(p.toLowerCase()))
  ) {
    errors.push(
      'JWT_SECRET is still a placeholder or too short (min 32 chars). Generate one with: openssl rand -hex 32',
    );
  }

  if (!(process.env.DATABASE_URL ?? '').trim()) {
    errors.push('DATABASE_URL is required but was not set.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // --- CORS ---
  // Daftar origin diizinkan diambil dari env CORS_ORIGINS (pisahkan dengan koma).
  // Jika kosong, semua origin diizinkan (khusus pengembangan).
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // ----------

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});