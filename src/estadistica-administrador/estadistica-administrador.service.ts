import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inmobiliaria } from 'src/inmobiliaria/entities/inmobiliaria.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EstadisticaAdministradorService {

  constructor( 
    @InjectRepository(Inmobiliaria)
    private readonly inmobiliariaRepository: Repository<Inmobiliaria>,
    
  ) {}

  //Traer numero total de inmobiliarias.
  public async obtenerTotalInmobiliarias(): Promise<number> {
    return this.inmobiliariaRepository.count();
  }

  //Traer numero absoluto de inmobiliarias con plan premium.
  public async obtenerTotalInmobiliariasPremium(): Promise<number> {
    return this.inmobiliariaRepository.count({
      where: {
        plan: 'PREMIUM',
      },
    });
  }


  //Calcular el porcentaje de inmobiliarias premium respecto al total de inmobiliarias (25 premium / 100 totales = 25%)
  public async calcularPorcentajeInmobiliariasPremium(): Promise<number> {
    const totalInmobiliarias = await this.obtenerTotalInmobiliarias();
    const inmobiliariasPremium = await this.obtenerTotalInmobiliariasPremium();
    if (totalInmobiliarias === 0) {
      return 0;
    }
    return (inmobiliariasPremium / totalInmobiliarias) * 100;
  }


}
