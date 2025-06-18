import { Module } from '@nestjs/common';
import { EstiloArquitectonicoService } from './estilo-arquitectonico.service';
import { EstiloArquitectonicoController } from './estilo-arquitectonico.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstiloArquitectonico } from './entities/estilo-arquitectonico.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EstiloArquitectonico]),
  ],
  controllers: [EstiloArquitectonicoController],
  providers: [EstiloArquitectonicoService],
  exports:[EstiloArquitectonicoService]
})
export class EstiloArquitectonicoModule {}
