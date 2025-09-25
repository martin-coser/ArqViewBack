import { Module, forwardRef } from '@nestjs/common';
import { Modelo3DService } from './modelo3d.service';
import { Modelo3DController } from './modelo3d.controller';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modelo3D } from './entities/modelo3d.entity';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { PropiedadModule } from 'src/propiedad/propiedad.module';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InmobiliariaModule } from 'src/inmobiliaria/inmobiliaria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Modelo3D, Propiedad]),
    MulterModule.register({
      storage: diskStorage({
        destination: './modelos3d',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = extname(file.originalname);
          callback(null, `${uniqueSuffix}${extension}`);
        },
      }),
    }),
    forwardRef(() => PropiedadModule),
    InmobiliariaModule,
  ],
  controllers: [Modelo3DController],
  providers: [Modelo3DService],
  exports: [Modelo3DService],
})
export class Modelo3DModule { }