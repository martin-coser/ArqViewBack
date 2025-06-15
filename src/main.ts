import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm'; // Importa DataSource de TypeORM

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Iniciar el servidor
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Servidor corriendo en http://localhost:${port}`);

  // === Verificar conexión a la base de datos usando TypeORM de forma segura ===
  try {
    const dataSource = app.get(DataSource); // Obtener la instancia de DataSource inyectada por TypeORM
  
    if (dataSource.isInitialized) {
      logger.log('✅ Conexión a la base de datos establecida con éxito.');
    } else {
      logger.error('❌ La base de datos NO se ha inicializado. Revise la configuración de TypeOrmModule.');
    }
  } catch (error) {
    logger.error(`❌ Error al verificar el estado de la conexión a la base de datos: ${error.message}`);
  }
}

bootstrap();