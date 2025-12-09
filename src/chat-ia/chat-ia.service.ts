import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ActividadClienteService } from 'src/actividad-cliente/actividad-cliente.service';
import { ClienteService } from 'src/cliente/cliente.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PuntuacionChatIA } from './entities/puntuacion-chat-ia.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatIaService {
  constructor(private readonly httpService: HttpService, 
    private readonly actividadClienteService: ActividadClienteService,) {}
  constructor(
    private readonly httpService: HttpService,
    private readonly clienteService: ClienteService,
    @InjectRepository(PuntuacionChatIA)
    private readonly puntuacionChatIARepository: Repository<PuntuacionChatIA>,
  ) {}

  async processChatQuery(message: string, session_id : number): Promise<undefined> {
    try {
      //registrar el uso del chat
      this.actividadClienteService.registerChatUsage(session_id)
      .catch(error => console.error("Fallo al registrar log de chat:", error));

      //Llamar al API de Python (usando session_id en la llamada)
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:5001/chat', { session_id, message })
      );
      return response.data;
    } catch (error) {
      throw new Error('Error al procesar la consulta del chat');
    }
  }

  async guardarPuntuacion(idCuenta: number, puntuacion: number): Promise<void> {
    if (puntuacion < 1 || puntuacion > 5) {
      throw new BadRequestException('La puntuación debe estar entre 1 y 5');
    }

    const cliente = await this.clienteService.findByCuenta(idCuenta);
    
    const existingPuntuacion = await this.puntuacionChatIARepository.findOne({ where: { cliente: { id: cliente.id } } });
    if (existingPuntuacion) {
      existingPuntuacion.puntuacion = puntuacion;
      await this.puntuacionChatIARepository.save(existingPuntuacion);
      return;
    }
    
    const puntuacionChatIA = this.puntuacionChatIARepository.create({
    cliente: cliente, 
    puntuacion: puntuacion
    });

    await this.puntuacionChatIARepository.save(puntuacionChatIA)
  }

  async promedioPuntuaciones(): Promise<number> {
    const result = await this.puntuacionChatIARepository
      .createQueryBuilder('puntuacion')
      .select('AVG(puntuacion.puntuacion)', 'avg')
      .getRawOne();
    return parseFloat(result.avg) || 0;
  }
  
}