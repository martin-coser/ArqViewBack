import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: false,
    });

    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      next();
    });
    
    app.useStaticAssets(join(__dirname, '..', 'imagenes2d'), { prefix: '/imagenes2d/' });
    app.useStaticAssets(join(__dirname, '..', 'imagenes360'), { prefix: '/imagenes360/' });
    app.useStaticAssets(join(__dirname, '..', 'modelos3d'), { prefix: '/modelos3d/' });

    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH',
      credentials: true,
    });

    app.useGlobalPipes(new ValidationPipe());

    const port = process.env.PORT ?? 3000; // O 3001 si cambiaste el puerto
    await app.listen(port);


  } catch (error) {
    console.log('❌ Error en bootstrap:', error);
  }
}

bootstrap().catch(() => {
  process.exit(1);
});