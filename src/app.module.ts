import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // Para variables de entorno

@Module({
  imports: [
    // 1. Configura ConfigModule para cargar variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible en toda la aplicación
      envFilePath: ['.env.development', '.env'], // Carga .env.development primero, luego .env
    }),
    // 2. Configura TypeOrmModule para la conexión a la base de datos
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT ?? '5432'), 
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'arqview',
      entities: [
  
      ],
      synchronize: true, 
      logging: false, 
    }),
  ],
  controllers: [AppController], // Aquí listarás tus controladores
  providers: [AppService], // Aquí listarás tus servicios (lógica de negocio)
})
export class AppModule {}
