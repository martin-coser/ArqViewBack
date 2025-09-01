import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente } from 'src/cliente/entities/cliente.entity';
import { ListaDeInteres } from 'src/lista-de-interes/entities/lista-de-interes.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Notificacion } from 'src/notificacion/entities/notificacion.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';

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

  // Calcular similitud coseno entre dos propiedades, con ponderación estricta
  private calculateSimilarity(prop1: Propiedad, prop2: Propiedad, pesos: any, ranges: any): number {
    // Usar rangos dinámicos calculados por cada lista
    const minPrecio = ranges.minPrecio;
    const maxPrecio = ranges.maxPrecio;
    const minSuperficie = ranges.minSuperficie;
    const maxSuperficie = ranges.maxSuperficie;
    const minBanios = ranges.minBanios || 0;
    const maxBanios = ranges.maxBanios || 10;
    const minDormitorios = ranges.minDormitorios || 0;
    const maxDormitorios = ranges.maxDormitorios || 10;
    const minAmbientes = ranges.minAmbientes || 1;
    const maxAmbientes = ranges.maxAmbientes || 20;

    // Features numéricas
    const featuresNum1 = [
      this.normalize(prop1.precio, minPrecio, maxPrecio),
      this.normalize(prop1.superficie, minSuperficie, maxSuperficie),
      this.normalize(prop1.cantidadBanios, minBanios, maxBanios),
      this.normalize(prop1.cantidadDormitorios, minDormitorios, maxDormitorios),
      this.normalize(prop1.cantidadAmbientes, minAmbientes, maxAmbientes),
    ];
    const featuresNum2 = [
      this.normalize(prop2.precio, minPrecio, maxPrecio),
      this.normalize(prop2.superficie, minSuperficie, maxSuperficie),
      this.normalize(prop2.cantidadBanios, minBanios, maxBanios),
      this.normalize(prop2.cantidadDormitorios, minDormitorios, maxDormitorios),
      this.normalize(prop2.cantidadAmbientes, minAmbientes, maxAmbientes),
    ];

    // Aplicar pesos a las features normalizadas
    const weightedNum1 = featuresNum1.map((v, i) => v * (i < 5 ? pesos[`${['precio', 'superficie', 'banios', 'dormitorios', 'ambientes'][i]}`] : 0));
    const weightedNum2 = featuresNum2.map((v, i) => v * (i < 5 ? pesos[`${['precio', 'superficie', 'banios', 'dormitorios', 'ambientes'][i]}`] : 0));

    const dotNum = weightedNum1.reduce((sum, val, i) => sum + val * weightedNum2[i], 0);
    const normNum1 = Math.sqrt(weightedNum1.reduce((sum, val) => sum + val * val, 0));
    const normNum2 = Math.sqrt(weightedNum2.reduce((sum, val) => sum + val * val, 0));

    const cosineNum = (normNum1 && normNum2) ? dotNum / (normNum1 * normNum2) : 0;

    // Similitud categórica (binaria para tipo, con penalización fuerte si no coincide)
    const catSim = prop1.tipoPropiedad.id === prop2.tipoPropiedad.id ? 1 : (pesos.tipoPropiedad > 0.3 ? 0 : 0.4);

    // Suma de pesos numéricos (excluyendo tipo)
    const sumPesosNum = pesos.precio + pesos.superficie + pesos.banios + pesos.dormitorios + pesos.ambientes;

    // Similitud total: combinación ponderada con énfasis en tipo
    const sim = (sumPesosNum * cosineNum + pesos.tipoPropiedad * catSim) / (sumPesosNum + pesos.tipoPropiedad);

    return sim;
  }

  // Método para calcular los pesos dinámicamente y rangos
  private calcularPesosDinamicos(propiedades: Propiedad[]): { pesos: any; ranges: any } {
    const epsilon = 0.001; // Para evitar división por cero

    const precios = propiedades.map(p => p.precio);
    const superficies = propiedades.map(p => p.superficie);
    const banios = propiedades.map(p => p.cantidadBanios);
    const dormitorios = propiedades.map(p => p.cantidadDormitorios);
    const ambientes = propiedades.map(p => p.cantidadAmbientes);
    const tipos = propiedades.map(p => p.tipoPropiedad.id);

    // Calcular rangos dinámicos (mínimo y máximo de cada característica)
    const ranges = {
      minPrecio: Math.min(...precios) || 0,
      maxPrecio: Math.max(...precios) || 100000,
      minSuperficie: Math.min(...superficies) || 0,
      maxSuperficie: Math.max(...superficies) || 200,
      minBanios: Math.min(...banios) || 0,
      maxBanios: Math.max(...banios) || 10,
      minDormitorios: Math.min(...dormitorios) || 0,
      maxDormitorios: Math.max(...dormitorios) || 10,
      minAmbientes: Math.min(...ambientes) || 1,
      maxAmbientes: Math.max(...ambientes) || 20,
    };

    const calcularStdNormalizada = (valores: number[], minv: number, maxv: number) => {
      if (valores.length === 0) return 0;
      const normalized = valores.map(v => this.normalize(v, minv, maxv));
      const media = normalized.reduce((sum, v) => sum + v, 0) / normalized.length;
      const varianza = normalized.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / normalized.length;
      return Math.sqrt(varianza);
    };

    const stdDevs = {
      precio: calcularStdNormalizada(precios, ranges.minPrecio, ranges.maxPrecio),
      superficie: calcularStdNormalizada(superficies, ranges.minSuperficie, ranges.maxSuperficie),
      banios: calcularStdNormalizada(banios, ranges.minBanios, ranges.maxBanios),
      dormitorios: calcularStdNormalizada(dormitorios, ranges.minDormitorios, ranges.maxDormitorios),
      ambientes: calcularStdNormalizada(ambientes, ranges.minAmbientes, ranges.maxAmbientes),
      tipoPropiedad: calcularStdNormalizada(tipos, 1, 100), // Tipo sigue con rango fijo 1-100
    };

    const pesos = {
      precio: 1 / (stdDevs.precio + epsilon) * (stdDevs.precio < 0.2 ? 1.5 : 1),
      superficie: 1 / (stdDevs.superficie + epsilon) * (stdDevs.superficie < 0.2 ? 1.5 : 1),
      banios: 1 / (stdDevs.banios + epsilon),
      dormitorios: 1 / (stdDevs.dormitorios + epsilon),
      ambientes: 1 / (stdDevs.ambientes + epsilon),
      tipoPropiedad: 1 / (stdDevs.tipoPropiedad + epsilon) * 1.3,
    };

    const sumaPesos = Object.values(pesos).reduce((sum, p) => sum + p, 0);
    const pesosNormalizados = Object.fromEntries(
      Object.entries(pesos).map(([key, value]) => [key, value / sumaPesos]),
    );

    return { pesos: pesosNormalizados, ranges };
  }

  async generarRecomendaciones(clienteId: number): Promise<Propiedad[]> {
    const cliente = await this.clienteRepository.findOne({
      where: { id: clienteId },
      relations: ['localidad'],
    });
    if (!cliente) throw new Error('Cliente no encontrado');

    const listaDeInteres = await this.listaDeInteresRepository.findOne({
      where: { cliente: { id: clienteId } }, // Corregido: usar 'cliente' en lugar de 'id'
      relations: ['propiedades', 'propiedades.localidad', 'propiedades.tipoPropiedad'],
    });
    if (!listaDeInteres || !listaDeInteres.propiedades.length) return [];

    const allPropiedades = await this.propiedadRepository.find({
      relations: ['localidad', 'tipoPropiedad'],
    });

    const { pesos, ranges } = this.calcularPesosDinamicos(listaDeInteres.propiedades);

    const recomendaciones = allPropiedades
      .map((prop) => ({
        propiedad: prop,
        score: listaDeInteres.propiedades.reduce(
          (sum, interes) => sum + this.calculateSimilarity(interes, prop, pesos, ranges),
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

      const { pesos, ranges } = this.calcularPesosDinamicos(listaDeInteres.propiedades);

      const score = listaDeInteres.propiedades.reduce(
        (sum, interes) => sum + this.calculateSimilarity(interes, nuevaPropiedad, pesos, ranges),
        0,
      ) / listaDeInteres.propiedades.length;

      console.log(`Score de similitud para ${cliente.nombre}: ${score}`);
      if (score > 0.85) {
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