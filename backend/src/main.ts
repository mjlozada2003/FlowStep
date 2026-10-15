import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors(); // Fundamental para que la app móvil se conecte
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Remueve campos no definidos en el DTO
    forbidNonWhitelisted: true, // Retorna error si envían campos no permitidos
  }));

  // Configuración de OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('FlowStep API')
    .setDescription('Contrato de comunicación y documentación interactiva de la API de FlowStep para la integración con la aplicación móvil.')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa el token JWT recibido en /auth/login para acceder a los endpoints protegidos',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Servidor FlowStep corriendo en: http://localhost:${port}`);
  console.log(`📖 Documentación Swagger disponible en: http://localhost:${port}/api/docs`);
}
bootstrap();
