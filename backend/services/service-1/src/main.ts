import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerUtility } from '@libs/nestjs-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Setup Swagger using shared utility
  SwaggerUtility.setupSwagger({
    app,
    config: {
      title: 'Service-1 API',
      description: 'Channels microservice API',
      version: '1.0',
      path: 'docs',
      customSiteTitle: 'Service-1 API',
    },
    basePath: process.env.PROXY_BASE_PATH,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
