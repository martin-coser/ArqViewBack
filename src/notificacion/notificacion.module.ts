import { Module } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';
import { NotificacionController } from './notificacion.controller';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { Notificacion } from './entities/notificacion.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente,Notificacion,Propiedad,ListaDeInteres]),
EventEmitterModule
],
  controllers: [NotificacionController],
  providers: [NotificacionService],
})
export class NotificacionModule {}
