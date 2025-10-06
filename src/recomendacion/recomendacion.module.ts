import { Module } from '@nestjs/common';
import { RecomendacionService } from './recomendacion.service';
import { RecomendacionController } from './recomendacion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Notificacion } from 'src/notificacion/entities/notificacion.entity';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente, ListaDeInteres, Propiedad, Notificacion]),
    MailerModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            transport: {
              host: configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
              port: configService.get<number>('MAIL_PORT', 587),
              secure: false,
              auth: {
                user: configService.get<string>('MAIL_USER'),
                pass: configService.get<string>('MAIL_PASS'), 
              },
            },
            defaults: {
              from: '"No Reply" <arqview8@gmail.com>', 
            },
          }),
          inject: [ConfigService],
        }),
  ],
  controllers: [RecomendacionController],
  providers: [RecomendacionService],
  exports: [RecomendacionService],
})
export class RecomendacionModule {}
