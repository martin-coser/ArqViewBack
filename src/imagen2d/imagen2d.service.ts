import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Imagen2d } from './entities/imagen2d.entity';
import { UploadImagen2dDto } from './dto/upload-imagen2d.dto';

@Injectable()
export class Imagen2dService {
  constructor(
    @InjectRepository(Imagen2d)
    private readonly imagen2dRepository: Repository<Imagen2d>,
  ) {}

  async upload(file: Express.Multer.File, uploadImagen2dDto?: UploadImagen2dDto): Promise<{ imageUrl: string }> {
    // Crear una nueva instancia de Imagen2d
    const imagen = new Imagen2d();
    imagen.filePath = `/imagenes2d/${file.filename}`; // Ruta pública de la imagen
    if (uploadImagen2dDto?.descripcion) {
      imagen.descripcion = uploadImagen2dDto.descripcion; // Asignar descripción si se proporciona
    }

    // Guardar en la base de datos
    const savedImagen = await this.imagen2dRepository.save(imagen);

    // Devolver la URL de la imagen
    return { imageUrl: savedImagen.filePath };
  }
}