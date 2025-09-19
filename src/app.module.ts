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
import { ClienteModule } from './cliente/cliente.module';
import { InmobiliariaModule } from './inmobiliaria/inmobiliaria.module';
import { Imagen2dModule } from './imagen2d/imagen2d.module';
import { ListaDeInteresModule } from './lista-de-interes/lista-de-interes.module';
import { MensajeModule } from './mensaje/mensaje.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificacionModule } from './notificacion/notificacion.module'; 
import { ActividadClienteModule } from './actividad-cliente/actividad-cliente.module';
import { RecomendacionModule } from './recomendacion/recomendacion.module';
import { EstadisticaPropiedadModule } from './estadistica-propiedad/estadistica-propiedad.module';
import { Imagen360Module } from './imagen360/imagen360.module';
import { Modelo3DModule } from './modelo3d/modelo3d.module';
import { CalificacionResenaModule } from './calificacion-reseña/calificacion-reseña.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
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
    ClienteModule,
    Imagen2dModule,
    ListaDeInteresModule,
    MensajeModule,
    NotificacionModule,
    ActividadClienteModule,
    RecomendacionModule,
    EstadisticaPropiedadModule,
    Imagen360Module,
    Modelo3DModule,
    CalificacionResenaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}