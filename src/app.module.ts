import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // Para variables de entorno
import { PropiedadModule } from './propiedad/propiedad.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT ?? '5432'), 
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'arqview',
      entities: [__dirname + '/**/*.entity{.ts,.js}'], // Añadido para incluir entidades
      synchronize: true,
      dropSchema: true, // Recrea el esquema al iniciar
      logging: false, // Activado para depuración
    }),
    PropiedadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}