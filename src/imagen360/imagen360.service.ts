import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Imagen360 } from './entities/imagen360.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { UploadImagen360Dto } from './dto/UploadImagen360Dto';
import * as path from 'path';
import * as fs from 'fs'; 
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';


@Injectable()
export class Imagen360Service {
  
  constructor(
    @InjectRepository(Imagen360)
    private readonly imagen360Repository: Repository<Imagen360>,
    @InjectRepository(Propiedad)
    private readonly propiedadRepository: Repository<Propiedad>,
    private readonly inmobiliariaService: InmobiliariaService,
  ) {}

  async upload(file: Express.Multer.File, uploadImagen360Dto?: UploadImagen360Dto): Promise<{ imageUrl: string }> {

    // Crear una nueva instancia de Imagen360
    const imagen = new Imagen360();
    imagen.filePath = `/imagenes360/${file.filename}`;

    const propiedad = await this.propiedadRepository.findOneBy({ id: uploadImagen360Dto?.propiedad });

    if (!propiedad) {
      // Elimina el archivo si la propiedad no existe
      fs.unlinkSync(file.path);
      throw new NotFoundException(`Propiedad con ID ${uploadImagen360Dto?.propiedad} no encontrada.`);
    }

    imagen.propiedad = propiedad;

    if(uploadImagen360Dto?.descripcion) {
      imagen.descripcion = uploadImagen360Dto.descripcion; // Asignar descripción si se proporciona
    }

    // Guardar en la base de datos
    const savedImagen = await this.imagen360Repository.save(imagen);

    // Devolver la URL de la imagen
    return { imageUrl: savedImagen.filePath };
  }
    
  async remove(id: number): Promise<void> {
    const imagen = await this.imagen360Repository.findOneBy({ id });

    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
    }

    //Construir la ruta absoluta del archivo
    const imagePath = path.join(process.cwd(), imagen.filePath); // process.cwd() obtiene el directorio de trabajo actual'

    // Eliminar el archivo del sistema de archivos
    try {
      if (fs.existsSync(imagePath)) { // Verificar si el archivo existe antes de intentar eliminarlo
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      console.error(`Error al eliminar el archivo ${imagePath}:`, error); 
      // Puedes decidir si quieres lanzar una excepción o simplemente registrar el error
      // throw new InternalServerErrorException('Error al eliminar el archivo de imagen.'); 
    }

    // Eliminar la imagen de la base de datos
    await this.imagen360Repository.remove(imagen);
  }

  async updateDescription(id: number, descripcion: string): Promise<Imagen360> {
    const imagen = await this.imagen360Repository.findOneBy({ id });
  
    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
    }
  
    imagen.descripcion = descripcion;
    return this.imagen360Repository.save(imagen);
    }

  async findByPropiedad(propiedadId: number): Promise<Imagen360[]> {
    

    // verificar que la inmobiliaria tenga el plan premium
    if (await this.inmobiliariaService.esPremium(propiedadId)) {
      // verificar si la propiedad existe
      const propiedad = await this.propiedadRepository.findOneBy({ id: propiedadId });

      if (!propiedad) {
        throw new NotFoundException(`Propiedad con ID ${propiedadId} no encontrada.`);
      }

      // Buscar imágenes asociadas a la propiedad
      const imagenes = await this.imagen360Repository.find({ 
        where: { propiedad: { id: propiedadId } },
      });

      return imagenes;
    }

    return [];

  }
  
}
