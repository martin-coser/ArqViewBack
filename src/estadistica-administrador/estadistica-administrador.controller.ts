import { Controller} from '@nestjs/common';
import { EstadisticaAdministradorService } from './estadistica-administrador.service';

@Controller('estadistica-administrador')
export class EstadisticaAdministradorController {
  constructor(private readonly estadisticaAdministradorService: EstadisticaAdministradorService) {}


}
