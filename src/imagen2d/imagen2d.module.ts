import { Module, forwardRef } from '@nestjs/common';
import { Imagen2dService } from './imagen2d.service';
import { Imagen2dController } from './imagen2d.controller';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Imagen2d } from './entities/imagen2d.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { PropiedadModule } from 'src/propiedad/propiedad.module';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Imagen2d, Propiedad]),
    MulterModule.register({
      storage: diskStorage({
        destination: './imagenes2d',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = extname(file.originalname);
          callback(null, `${uniqueSuffix}${extension}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
    forwardRef(() => PropiedadModule), // Para PropiedadService y PropiedadRepository
  ],
  controllers: [Imagen2dController],
  providers: [Imagen2dService],
  exports: [Imagen2dService],
})
export class Imagen2dModule {}