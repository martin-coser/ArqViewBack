import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Imagen2d } from './entities/imagen2d.entity';
import { UploadImagen2dDto } from './dto/upload-imagen2d.dto';
import * as fs from 'fs'; // Importa el módulo 'fs' para operaciones de archivos
import * as path from 'path'; // Importa el módulo 'path' para resolver rutas
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';

@Injectable()
export class Imagen2dService {
  constructor(
    @InjectRepository(Imagen2d)
    private readonly imagen2dRepository: Repository<Imagen2d>,
    @InjectRepository(Propiedad)
    private readonly propiedadRepository: Repository<Propiedad>,
  ) {}

  async upload(file: Express.Multer.File, uploadImagen2dDto?: UploadImagen2dDto): Promise<{ imageUrl: string }> {
    // Crear una nueva instancia de Imagen2d
    const imagen = new Imagen2d();
    imagen.filePath = `/imagenes2d/${file.filename}`; // Ruta pública de la imagen

    const propiedad = await this.propiedadRepository.findOneBy({ id: uploadImagen2dDto?.propiedad });

    if (!propiedad) {
      throw new NotFoundException(`Propiedad con ID ${uploadImagen2dDto?.propiedad} no encontrada.`);
    }

    imagen.propiedad = propiedad; 

    if (uploadImagen2dDto?.descripcion) {
      imagen.descripcion = uploadImagen2dDto.descripcion; // Asignar descripción si se proporciona
    }

    // Guardar en la base de datos
    const savedImagen = await this.imagen2dRepository.save(imagen);

    // Devolver la URL de la imagen
    return { imageUrl: savedImagen.filePath };
  }

  async remove(id: number): Promise<void> {
    const imagen = await this.imagen2dRepository.findOneBy({ id });

    console.log(`filepath desde el servicio ${imagen?.filePath}`)

    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
    }

    // Construir la ruta absoluta del archivo
    const imagePath = path.join(process.cwd(), imagen.filePath); // process.cwd() obtiene el directorio de trabajo actual

    console.log(`ruta absoluta de la imagen ${imagePath}`)


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

    // Eliminar la entrada de la base de datos
    await this.imagen2dRepository.remove(imagen);
  }

  async updateDescription(id: number, descripcion: string): Promise<Imagen2d> {
  const imagen = await this.imagen2dRepository.findOneBy({ id });

  if (!imagen) {
    throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
  }

  imagen.descripcion = descripcion;
  return this.imagen2dRepository.save(imagen);
  }
}