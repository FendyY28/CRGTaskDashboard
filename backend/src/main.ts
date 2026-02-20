import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- SETTING CORS PALING AMAN (UNTUK DEV) ---
  app.enableCors({
    origin: true, // Bolehkan semua domain (Frontend) masuk
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // ---------------------------------------------

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();