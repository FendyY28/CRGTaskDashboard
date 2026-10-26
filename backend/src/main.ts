import { ValidationPipe } from '@nestjs/common';
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

  // Validate incoming DTO payloads globally.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      skipUndefinedProperties: true,
    }),
  );

  // Allow origins listed in CORS_ORIGINS; fall back to any origin when unset.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().catch((err: any) => {
  // Port already taken: say so plainly instead of a bare stack trace.
  if (err?.code === 'EADDRINUSE') {
    console.error(
      `Port ${process.env.PORT ?? 3000} is already in use. Stop the other process ` +
        '(see Troubleshooting in the README) or change PORT in backend/.env.',
    );
    process.exit(1);
  }
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});