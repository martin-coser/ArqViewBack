import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Imagen2d } from './entities/imagen2d.entity';
import { UploadImagen2dDto } from './dto/upload-imagen2d.dto';
import * as fs from 'fs';
import * as path from 'path';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import axios from 'axios';
import * as FormData from 'form-data'; // Agregamos form-data

@Injectable()
export class Imagen2dService {
  constructor(
    @InjectRepository(Imagen2d)
    private readonly imagen2dRepository: Repository<Imagen2d>,
    @InjectRepository(Propiedad)
    private readonly propiedadRepository: Repository<Propiedad>,
  ) {}

  private readonly modelUrl = 'http://localhost:5000/predict';

  async upload(file: Express.Multer.File, uploadImagen2dDto?: UploadImagen2dDto): Promise<{ imageUrl: string }> {
    const imagen = new Imagen2d();
    imagen.filePath = `/imagenes2d/${file.filename}`;

    const propiedad = await this.propiedadRepository.findOneBy({ id: uploadImagen2dDto?.propiedad });

    if (!propiedad) {
      fs.unlinkSync(file.path);
      throw new NotFoundException(`Propiedad con ID ${uploadImagen2dDto?.propiedad} no encontrada.`);
    }

    imagen.propiedad = propiedad;

    if (uploadImagen2dDto?.descripcion) {
      imagen.descripcion = uploadImagen2dDto.descripcion;
    }

    const savedImagen = await this.imagen2dRepository.save(imagen);
    return { imageUrl: savedImagen.filePath };
  }

  async remove(id: number): Promise<void> {
    const imagen = await this.imagen2dRepository.findOneBy({ id });

    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
    }

    const imagePath = path.join(process.cwd(), imagen.filePath);
    
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      console.error(`Error al eliminar el archivo ${imagePath}:`, error);
    }

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

  async findByPropiedad(propiedadId: number): Promise<Imagen2d[]> {
    const propiedad = await this.propiedadRepository.findOneBy({ id: propiedadId });

    if (!propiedad) {
      throw new NotFoundException(`Propiedad con ID ${propiedadId} no encontrada.`);
    }

    const imagenes = await this.imagen2dRepository.find({
      where: { propiedad: { id: propiedadId } },
    });

    return imagenes;
  }

  async analyzeImage(id: number): Promise<void> {
    const imagen = await this.imagen2dRepository.findOneBy({ id });
    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${id} no encontrada.`);
    }

    // Leer archivo de imagen
    const fullPath = path.join(process.cwd(), imagen.filePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Archivo de imagen no encontrado en ${fullPath}.`);
    }

    // Leer el archivo como un buffer
    const buffer = fs.readFileSync(fullPath);

    // Crear formulario multipart
    const formData = new FormData();
    formData.append('image', buffer, {
      filename: path.basename(fullPath),
      contentType: 'image/jpeg', 
    });
    try {
      const response = await axios.post(this.modelUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      const { predicted_part, features } = response.data;

      // Traduccion de respuestas del modelo a español
      const parteMap: Record<string, string> = {
        'barbacoa': 'barbacoa',
        'kitchen': 'cocina',
        'bathroom': 'baño',
        'dining room': 'comedor',
        'bedroom': 'habitacion',
        'living room': 'sala de estar',
        'yard': 'patio',
        'garage': 'garage',
        'facade': 'fachada',
        'hallway': 'pasillo',
        'balcony/terrace': 'balcon/terraza',
        'service room': 'cuarto de servicio',
        'office': 'oficina',
        'laundry room': 'lavanderia',
        'stairs': 'escaleras',
        'pool': 'piscina',
        'gym': 'gimnasio',
        'basement': 'sotano',
        'roof': 'techo',
        'entrance': 'entrada',
        'modern kitchen': 'cocina moderna',
        'luxury bathroom': 'baño de lujo',
        'master bedroom': 'dormitorio principal',
        'living area': 'area de estar',
        'patio': 'patio',
        'maid room': 'cuarto de servicio',
        'study': 'estudio',
        'storage': 'bodega',
        'corridor': 'pasillo',
        'viewpoint': 'mirador',
      };
      const parte = parteMap[predicted_part.toLowerCase()] || 'otro';

      // Generar array de tags con sector y caracteristicas
      const tags: string[] = [parte];
      tags.push(features.size);
      tags.push(features.light);

      // Guardar tags como string separada por comas
      imagen.tags_visuales = tags.join(',');
      await this.imagen2dRepository.save(imagen);
    } catch (error) {
      console.error('Error al analizar la imagen:', error.response ? error.response.data : error.message);
      throw new Error(`Error al analizar la imagen: ${error.response ? error.response.data : error.message}`);
    }
  }
}