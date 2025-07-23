import { Module } from '@nestjs/common';
import { ClienteService } from './cliente.service';
import { ClienteController } from './cliente.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from './entities/cliente.entity';
import { Cuenta } from 'src/auth/entities/cuenta.entity';
import { Localidad } from 'src/localidad/entities/localidad.entity';

@Module({
  imports: [
      TypeOrmModule.forFeature([
        Cliente,
        Localidad,
        Cuenta

      ]), // Agrega esto para que TypeORM sepa de tu entidad Cliente
    ],
  controllers: [ClienteController],
  providers: [ClienteService],
})
export class ClienteModule {}
