import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for frontend running on http://localhost:3000
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
