import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });

  // Crear admin por defecto si no existe
  const authService = app.get(AuthService);
  await authService.seedAdmin();

  await app.listen(3000);
}
bootstrap();
