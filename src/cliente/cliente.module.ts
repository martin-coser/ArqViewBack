import { Module } from '@nestjs/common';
import { ClienteService } from './cliente.service';
import { ClienteController } from './cliente.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from './entities/cliente.entity';

@Module({
  imports: [
      TypeOrmModule.forFeature([Cliente]), // Agrega esto para que TypeORM sepa de tu entidad Cliente
    ],
  controllers: [ClienteController],
  providers: [ClienteService],
})
export class ClienteModule {}
