import { Module } from '@nestjs/common';
import { ListaDeInteresService } from './lista-de-interes.service';
import { ListaDeInteresController } from './lista-de-interes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListaDeInteres } from './entities/lista-de-interes.entity';

@Module({
   imports: [
      TypeOrmModule.forFeature([ListaDeInteres]),
    ],
  controllers: [ListaDeInteresController],
  providers: [ListaDeInteresService],
})
export class ListaDeInteresModule {}
