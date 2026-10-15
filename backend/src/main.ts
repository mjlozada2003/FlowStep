import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors(); // Fundamental para que la app móvil se conecte
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Remueve campos no definidos en el DTO
    forbidNonWhitelisted: true, // Retorna error si envían campos no permitidos
  }));

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
