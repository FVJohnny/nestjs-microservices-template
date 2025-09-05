import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { SwaggerSetupOptions } from './swagger-config.interface';

export class SwaggerUtility {
  private static readonly logger = new Logger(SwaggerUtility.name);
  static setupSwagger(options: SwaggerSetupOptions): void {
    const { app, config, basePath } = options;
    
    // Check if Swagger should be enabled
    const enableSwagger = config.enabled ?? true;
    
    if (!enableSwagger) {
      this.logger.log('Swagger documentation disabled');
      return;
    }

    // Build Swagger configuration
    const builder = new DocumentBuilder()
      .setTitle(config.title)
      .setDescription(config.description)
      .setVersion(config.version || '1.0');
    
    // Add server configuration for reverse proxy
    if (basePath) {
      builder.addServer(basePath);
    }
    
    const swaggerConfig = builder.build();
    // Narrow unknown to the type SwaggerModule expects
    const nestApp = app as Parameters<typeof SwaggerModule.createDocument>[0];
    const document = SwaggerModule.createDocument(nestApp, swaggerConfig, {
      include: [],
      deepScanRoutes: true,
    });
    
    // Setup Swagger UI
    const swaggerPath = config.path || 'docs';
    SwaggerModule.setup(swaggerPath, nestApp, document, {
      customSiteTitle: config.customSiteTitle || config.title,
      swaggerOptions: basePath
        ? { url: `${basePath}/${swaggerPath}-json` }
        : undefined,
    });
    
    // Log the Swagger URL
    const swaggerUrl = basePath 
      ? `${basePath}/${swaggerPath}` 
      : `http://localhost:${process.env.PORT || 3000}/${swaggerPath}`;
    
    this.logger.log(`📚 Swagger documentation available at: ${swaggerUrl}`);
  }
}
