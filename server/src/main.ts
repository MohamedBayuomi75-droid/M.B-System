import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  setupApp(app);
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`server listening on :${port}`);
}
bootstrap();
