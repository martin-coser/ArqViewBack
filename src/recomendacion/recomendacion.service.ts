import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Notificacion } from 'src/notificacion/entities/notificacion.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';

/**
 * Servicio para generar recomendaciones de propiedades basadas en similitud coseno
 * y enviar notificaciones a clientes cuando se añaden nuevas propiedades.
 */
@Injectable()
export class RecomendacionService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(ListaDeInteres)
    private listaDeInteresRepository: Repository<ListaDeInteres>,
    @InjectRepository(Propiedad)
    private propiedadRepository: Repository<Propiedad>,
    @InjectRepository(Notificacion)
    private notificacionRepository: Repository<Notificacion>,

    private readonly mailerService: MailerService,
  ) {}

  // Normalizar valores para manejar diferentes escalas
  private normalize(value: number, min: number, max: number): number {
    return max - min !== 0 ? (value - min) / (max - min) : 0;
  }

  // Calcular similitud coseno entre dos propiedades, ahora con ponderación
  private calculateSimilarity(prop1: Propiedad, prop2: Propiedad, pesos: any): number {
    // Rangos aproximados para normalización (ajusta según tu base de datos)
    const minPrecio = 10000;
    const maxPrecio = 1000000;
    const minSuperficie = 20;
    const maxSuperficie = 1000;
    const minBanios = 0;
    const maxBanios = 10;
    const minDormitorios = 0;
    const maxDormitorios = 10;
    const minAmbientes = 1;
    const maxAmbientes = 20;

    const features1 = [
      this.normalize(prop1.precio, minPrecio, maxPrecio) * pesos.precio,
      this.normalize(prop1.superficie, minSuperficie, maxSuperficie) * pesos.superficie,
      this.normalize(prop1.cantidadBanios, minBanios, maxBanios) * pesos.banios,
      this.normalize(prop1.cantidadDormitorios, minDormitorios, maxDormitorios) * pesos.dormitorios,
      this.normalize(prop1.cantidadAmbientes, minAmbientes, maxAmbientes) * pesos.ambientes,
      (prop1.tipoPropiedad.id === prop2.tipoPropiedad.id ? 1 : 0) * pesos.tipoPropiedad,
    ];
    const features2 = [
      this.normalize(prop2.precio, minPrecio, maxPrecio) * pesos.precio,
      this.normalize(prop2.superficie, minSuperficie, maxSuperficie) * pesos.superficie,
      this.normalize(prop2.cantidadBanios, minBanios, maxBanios) * pesos.banios,
      this.normalize(prop2.cantidadDormitorios, minDormitorios, maxDormitorios) * pesos.dormitorios,
      this.normalize(prop2.cantidadAmbientes, minAmbientes, maxAmbientes) * pesos.ambientes,
      (prop1.tipoPropiedad.id === prop2.tipoPropiedad.id ? 1 : 0) * pesos.tipoPropiedad,
    ];

    const dotProduct = features1.reduce((sum, val, i) => sum + val * features2[i], 0);
    const norm1 = Math.sqrt(features1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(features2.reduce((sum, val) => sum + val * val, 0));

    return norm1 && norm2 ? dotProduct / (norm1 * norm2) : 0;
  }

  // Nuevo método para calcular los pesos dinámicamente
  private calcularPesosDinamicos(propiedades: Propiedad[]): any {
    const precios = propiedades.map(p => p.precio);
    const superficies = propiedades.map(p => p.superficie);
    const banios = propiedades.map(p => p.cantidadBanios);
    const dormitorios = propiedades.map(p => p.cantidadDormitorios);
    const ambientes = propiedades.map(p => p.cantidadAmbientes);

    const calcularDesviacionEstandar = (valores: number[]) => {
      const media = valores.reduce((sum, v) => sum + v, 0) / valores.length;
      const varianza = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valores.length;
      return Math.sqrt(varianza);
    };

    const stdDevs = {
      precio: calcularDesviacionEstandar(precios),
      superficie: calcularDesviacionEstandar(superficies),
      banios: calcularDesviacionEstandar(banios),
      dormitorios: calcularDesviacionEstandar(dormitorios),
      ambientes: calcularDesviacionEstandar(ambientes),
    };

    const pesos = {
      precio: 1 / (stdDevs.precio || 1),
      superficie: 1 / (stdDevs.superficie || 1),
      banios: 1 / (stdDevs.banios || 1),
      dormitorios: 1 / (stdDevs.dormitorios || 1),
      ambientes: 1 / (stdDevs.ambientes || 1),
    };
    
    const sumaPesos = Object.values(pesos).reduce((sum, p) => sum + p, 0);
    const pesosNormalizados = {
        precio: pesos.precio / sumaPesos,
        superficie: pesos.superficie / sumaPesos,
        banios: pesos.banios / sumaPesos,
        dormitorios: pesos.dormitorios / sumaPesos,
        ambientes: pesos.ambientes / sumaPesos,
        tipoPropiedad: 1 
    };
    return pesosNormalizados;
  }

  async generarRecomendaciones(clienteId: number): Promise<Propiedad[]> {
    const cliente = await this.clienteRepository.findOne({
      where: { id: clienteId },
      relations: ['localidad'],
    });
    if (!cliente) throw new Error('Cliente no encontrado');

    const listaDeInteres = await this.listaDeInteresRepository.findOne({
      where: { cliente: { id: clienteId } },
      relations: ['propiedades', 'propiedades.localidad', 'propiedades.tipoPropiedad'],
    });
    if (!listaDeInteres || !listaDeInteres.propiedades.length) return [];

    const allPropiedades = await this.propiedadRepository.find({
      relations: ['localidad', 'tipoPropiedad'],
    });

    const pesos = this.calcularPesosDinamicos(listaDeInteres.propiedades);

    const recomendaciones = allPropiedades
      .map((prop) => ({
        propiedad: prop,
        score: listaDeInteres.propiedades.reduce(
          (sum, interes) => sum + this.calculateSimilarity(interes, prop, pesos),
          0,
        ) / listaDeInteres.propiedades.length,
      }))
      .filter((item) => !listaDeInteres.propiedades.some((p) => p.id === item.propiedad.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.propiedad);

    return recomendaciones;
  }

  async notificarNuevaPropiedad(propiedadId: number): Promise<void> {
    const nuevaPropiedad = await this.propiedadRepository.findOne({
      where: { id: propiedadId },
      relations: ['localidad', 'tipoPropiedad'],
    });
    if (!nuevaPropiedad) return;

    const clientes = await this.clienteRepository.find({ relations: ['localidad', 'cuenta'] });
    const listasDeInteres = await this.listaDeInteresRepository.find({
      relations: ['propiedades', 'propiedades.localidad', 'propiedades.tipoPropiedad', 'cliente'],
    });

    const listaMap = new Map(
      listasDeInteres.map((lista) => [lista.cliente.id, lista]),
    );

    for (const cliente of clientes) {
      const listaDeInteres = listaMap.get(cliente.id);
      if (!listaDeInteres || !listaDeInteres.propiedades.length) continue;

      const pesos = this.calcularPesosDinamicos(listaDeInteres.propiedades);

      const score = listaDeInteres.propiedades.reduce(
        (sum, interes) => sum + this.calculateSimilarity(interes, nuevaPropiedad, pesos),
        0,
      ) / listaDeInteres.propiedades.length;

      console.log(`Score de similitud para ${cliente.nombre}: ${score}`);
      if (score > 0.8) {
        const notificacion = this.notificacionRepository.create({
          mensaje: `Nueva propiedad en ${nuevaPropiedad.localidad.nombre}: ${nuevaPropiedad.nombre}`,
          tipo: 'PROPIEDAD_NUEVA',
          cliente,
          propiedad: nuevaPropiedad,
          fecha: new Date(),
          leida: false,
        });
        await this.notificacionRepository.save(notificacion);

        try {
          await this.mailerService.sendMail({
            to: cliente.cuenta.email,
            from: 'grupo8albasoft@gmail.com',
            subject: 'Nueva Propiedad Recomendable',
            html: `
            <p>Hola ${cliente.nombre},</p>
            <p>Tenemos una nueva propiedad que podría interesarte:</p>
            <p><strong>${nuevaPropiedad.nombre}</strong></p>
            <p>Ubicación: ${nuevaPropiedad.localidad.nombre}</p>
            <p>Tipo: ${nuevaPropiedad.tipoPropiedad.nombre}</p>
            <p>¡No te la pierdas!</p>
            `,
          });
        } catch (error) {
          new NotFoundException(`No se pudo enviar el correo a ${cliente.cuenta.email}`);
        }
      }
    }
  }
}