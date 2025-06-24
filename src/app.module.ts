import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // Para variables de entorno
import { PropiedadModule } from './propiedad/propiedad.module';
import { TipoDePropiedadModule } from './tipo-de-propiedad/tipo-de-propiedad.module';
import { LocalidadModule } from './localidad/localidad.module';
import { ProvinciaModule } from './provincia/provincia.module';
import { EstiloArquitectonicoModule } from './estilo-arquitectonico/estilo-arquitectonico.module';
import { TipoDeVisualizacionModule } from './tipo-de-visualizacion/tipo-de-visualizacion.module';
import { AuthModule } from './auth/auth.module';
import { InmobiliariaModule } from './inmobiliaria/inmobiliaria.module';
import { ClienteModule } from './cliente/cliente.module';

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
      dropSchema: false, // Recrea el esquema al iniciar
      logging: false, // Activado para depuración
    }),
    PropiedadModule,
    TipoDePropiedadModule,
    LocalidadModule,
    ProvinciaModule,
    EstiloArquitectonicoModule,
    TipoDeVisualizacionModule,
    AuthModule,
    InmobiliariaModule,
    ClienteModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}