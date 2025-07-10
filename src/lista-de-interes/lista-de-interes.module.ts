import { Module } from '@nestjs/common';
import { ListaDeInteresService } from './lista-de-interes.service';
import { ListaDeInteresController } from './lista-de-interes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListaDeInteres } from './entities/lista-de-interes.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Cliente } from 'src/cliente/entities/cliente.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([
        ListaDeInteres,
        Propiedad,
        Cliente
      ]),
    ],
  controllers: [ListaDeInteresController],
  providers: [ListaDeInteresService,],
})
export class ListaDeInteresModule {}
