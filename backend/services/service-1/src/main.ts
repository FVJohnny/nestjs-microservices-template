import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerUtility } from '@libs/nestjs-common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Setup Swagger using shared utility
  SwaggerUtility.setupSwagger({
    app,
    config: {
      title: 'Service-1 API',
      description: 'Channels microservice API',
      version: '1.0',
      path: 'docs',
      customSiteTitle: 'Service-1 API'
    },
    basePath: process.env.PROXY_BASE_PATH
  });
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
