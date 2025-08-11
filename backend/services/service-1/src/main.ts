import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Swagger (OpenAPI) setup with reverse-proxy awareness
  const enableSwagger = (process.env.SWAGGER_ENABLED ?? 'true') !== 'false' && process.env.NODE_ENV !== 'production';
  if (enableSwagger) {
    const basePath = process.env.PROXY_BASE_PATH ?? '';
    const builder = new DocumentBuilder()
      .setTitle('Service-1 API')
      .setDescription('Channels microservice API')
      .setVersion('1.0');
    if (basePath) {
      builder.addServer(basePath);
    }
    const config = builder.build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      customSiteTitle: 'Service-1 API',
      swaggerOptions: basePath
        ? { url: `${basePath}/api-json` }
        : undefined,
    });
  }
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
