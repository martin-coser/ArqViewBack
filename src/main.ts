import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Iniciando la aplicación...');

  try {
    logger.log('Creando la aplicación NestJS...');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    logger.log('Aplicación creada con éxito.');

    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      next();
    });
    
    app.useStaticAssets(join(__dirname, '..', 'imagenes2d'), { prefix: '/imagenes2d/' });
    app.useStaticAssets(join(__dirname, '..', 'imagenes360'), { prefix: '/imagenes360/' });
    logger.log('Archivos estáticos configurados.');

    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH',
      credentials: true,
    });
    logger.log('CORS habilitado.');

    app.useGlobalPipes(new ValidationPipe());
    logger.log('ValidationPipe configurado.');

    const port = process.env.PORT ?? 3000; // O 3001 si cambiaste el puerto
    logger.log(`Intentando iniciar el servidor en el puerto ${port}...`);
    await app.listen(port);
    logger.log(`🚀 Servidor corriendo en http://localhost:${port}`);

    logger.log('Verificando conexión a la base de datos...');
    const dataSource = app.get(DataSource);
    if (dataSource.isInitialized) {
      logger.log('✅ Conexión a la base de datos establecida con éxito.');
    } else {
      logger.error('❌ La base de datos NO se ha inicializado.');
    }
  } catch (error) {
    logger.error(`❌ Error durante la inicialización: ${error.message}`, error.stack);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`❌ Error en bootstrap: ${error.message}`, error.stack);
  process.exit(1);
});