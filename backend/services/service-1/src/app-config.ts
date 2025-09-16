import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerUtility } from '@libs/nestjs-common';
import helmet from 'helmet';

export interface AppConfigOptions {
  enableCors?: boolean;
  enableHelmet?: boolean;
  enableSwagger?: boolean;
  enableShutdownHooks?: boolean;
}

export function configureApp(
  app: INestApplication,
  options: AppConfigOptions = {
    enableCors: true,
    enableHelmet: true,
    enableSwagger: true,
    enableShutdownHooks: true,
  },
): void {
  // Always apply validation pipe with consistent settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra properties for flexibility
      transform: true,
      forbidUnknownValues: false, // Allow unknown values for flexibility
    }),
  );

  // Enable CORS for production
  if (options.enableCors) {
    app.enableCors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    });
  }

  // Security
  if (options.enableShutdownHooks) {
    app.enableShutdownHooks();
  }

  if (options.enableHelmet) {
    app.use(helmet());
  }

  // Setup Swagger
  if (options.enableSwagger) {
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
  }
}
