import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerSetupOptions } from './swagger-config.interface';

export class SwaggerUtility {
  static setupSwagger(options: SwaggerSetupOptions): void {
    const { app, config, basePath } = options;
    
    // Check if Swagger should be enabled
    const enableSwagger = config.enabled ?? true;
    
    if (!enableSwagger) {
      console.log('Swagger documentation disabled');
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
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    
    // Setup Swagger UI
    const swaggerPath = config.path || 'docs';
    SwaggerModule.setup(swaggerPath, app, document, {
      customSiteTitle: config.customSiteTitle || config.title,
      swaggerOptions: basePath
        ? { url: `${basePath}/${swaggerPath}-json` }
        : undefined,
    });
    
    // Log the Swagger URL
    const swaggerUrl = basePath 
      ? `${basePath}/${swaggerPath}` 
      : `http://localhost:${process.env.PORT || 3000}/${swaggerPath}`;
    
    console.log(`📚 Swagger documentation available at: ${swaggerUrl}`);
  }
}
