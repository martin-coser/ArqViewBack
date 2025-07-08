import { Module } from '@nestjs/common';
import { ListaDeInteresService } from './lista-de-interes.service';
import { ListaDeInteresController } from './lista-de-interes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListaDeIntere } from './entities/lista-de-intere.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([ListaDeIntere]),
    ],
  controllers: [ListaDeInteresController],
  providers: [ListaDeInteresService],
})
export class ListaDeInteresModule {}
