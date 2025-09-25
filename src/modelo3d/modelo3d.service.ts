import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modelo3D } from './entities/modelo3d.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { UploadModelo3DDto } from './dto/upload-modelo3d.dto';
import path from 'path';
import * as fs from 'fs'; 
import { InmobiliariaService } from 'src/inmobiliaria/inmobiliaria.service';


@Injectable()
export class Modelo3DService {

  constructor(
    @InjectRepository(Modelo3D)
    private readonly modelo3DRepository: Repository<Modelo3D>,
    @InjectRepository(Propiedad)
    private readonly propiedadRepository: Repository<Propiedad>,
    private readonly inmobiliariaService: InmobiliariaService,
  ) {}

  async upload(file: Express.Multer.File, uploadModelo3DDto?: UploadModelo3DDto): Promise<{ imageUrl: string }> {
    const modelo3D = new Modelo3D();
    modelo3D.filePath = `/modelos3d/${file.filename}`; 
    const propiedad = await this.propiedadRepository.findOneBy({ id: uploadModelo3DDto?.propiedad });

    if (!propiedad) {
      throw new NotFoundException(`Propiedad con ID ${uploadModelo3DDto?.propiedad} no encontrada.`);
    }

    modelo3D.propiedad = propiedad;
    const savedModelo3D = await this.modelo3DRepository.save(modelo3D);
    return { imageUrl: savedModelo3D.filePath };
  }
    
  async remove(id: number): Promise<void> {
    const modelo3D = await this.modelo3DRepository.findOneBy({ id });
    if (!modelo3D) {
      throw new NotFoundException(`Modelo 3D con ID ${id} no encontrado.`);
    }
    const imagePath = path.join(process.cwd(), modelo3D.filePath); 
    try {
      if (fs.existsSync(imagePath)) { 
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      console.error(`Error al eliminar el archivo ${imagePath}:`, error); 
    }
    await this.modelo3DRepository.remove(modelo3D);
  }

  async findByPropiedad(propiedadId: number): Promise<Modelo3D[]> {
    
    if( await this.inmobiliariaService.esPremium(propiedadId)){
      const propiedad = await this.propiedadRepository.findOneBy({ id: propiedadId });

      if (!propiedad) {
        throw new NotFoundException(`Propiedad con ID ${propiedadId} no encontrada.`);
      }
      const modelos3D = await this.modelo3DRepository.find({
        where: { propiedad: { id: propiedadId } },
      });

      return modelos3D;
    }
    return []
  }
  
}
