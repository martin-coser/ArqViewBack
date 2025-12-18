import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ClienteService } from 'src/cliente/cliente.service';
import { InjectRepository } from '@nestjs/typeorm';
import { PuntuacionChatIA } from './entities/puntuacion-chat-ia.entity';
import { Repository } from 'typeorm';
import { ActividadClienteService } from 'src/actividad-cliente/actividad-cliente.service';

@Injectable()
export class ChatIaService {
  constructor(
    private readonly httpService: HttpService,
    private readonly clienteService: ClienteService,
    @InjectRepository(PuntuacionChatIA)
    private readonly puntuacionChatIARepository: Repository<PuntuacionChatIA>,
    private readonly actividadClienteService: ActividadClienteService,
  ) {}

  async processChatQuery(message: string, session_id : number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:5001/chat', { session_id, message })
      );

      try {
        await this.actividadClienteService.registerChatUsage(session_id);
      } catch (err) {
        console.error('Error registrando métrica de IA:', err.message);
      }

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