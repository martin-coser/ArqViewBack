import { Module } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { NotificacionController } from './notificacion.controller';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Notificacion } from './entities/notificacion.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { NotificacionMensaje } from './entities/notificacionMensaje.entity';
import { Mensaje } from 'src/mensaje/entities/mensaje.entity';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Importar ConfigModule
import { Cuenta } from 'src/auth/entities/cuenta.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Cargar variables de entorno
    TypeOrmModule.forFeature([Cliente, Notificacion, Propiedad, ListaDeInteres, NotificacionMensaje, Mensaje, Cuenta]),
    EventEmitterModule.forRoot(), // Configuración recomendada para EventEmitter
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
          port: configService.get<number>('MAIL_PORT', 587),
          secure: false,
          auth: {
            user: configService.get<string>('MAIL_USER'), // grupo8albasoft@gmail.com
            pass: configService.get<string>('MAIL_PASS'), // Contraseña o app password
          },
        },
        defaults: {
          from: '"No Reply" <grupo8albasoft@gmail.com>', // Asegúrate de que coincida con MAIL_USER
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificacionController],
  providers: [NotificacionService],
})
export class NotificacionModule {}