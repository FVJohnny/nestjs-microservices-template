import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerUtility } from '@libs/nestjs-common';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';

export interface AppConfigOptions {
  enableCors?: boolean;
  enableHelmet?: boolean;
  enableSwagger?: boolean;
  enableShutdownHooks?: boolean;
  requestSizeLimit?: string;
}

export function configureApp(
  app: INestApplication,
  options: AppConfigOptions = {
    enableCors: true,
    enableHelmet: true,
    enableSwagger: true,
    enableShutdownHooks: true,
    requestSizeLimit: '1mb',
  },
): void {
  // Configure request size limits
  app.use(bodyParser.json({ limit: options.requestSizeLimit }));
  app.use(bodyParser.urlencoded({ limit: options.requestSizeLimit, extended: true }));

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable API versioning with default version
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

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
    const isProduction = process.env.NODE_ENV === 'production';
    app.use(
      helmet({
        hsts: isProduction
          ? {
              maxAge: 31536000, // 1 year
              includeSubDomains: true,
              preload: true,
            }
          : false, // Disable HSTS in development
        referrerPolicy: {
          policy: ['strict-origin-when-cross-origin'],
        },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
            scriptSrc: ["'self'"], // Strict script policy
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
      }),
    );
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
