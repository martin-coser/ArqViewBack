import { Module } from '@nestjs/common';
import { Imagen360Service } from './imagen360.service';
import { Imagen360Controller } from './imagen360.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Propiedad } from 'src/propiedad/entities/propiedad.entity';
import { Imagen360 } from './entities/imagen360.entity';
import { MulterModule } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { InmobiliariaModule } from 'src/inmobiliaria/inmobiliaria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Imagen360, Propiedad]), 
    MulterModule.register({
      storage: diskStorage({
        destination: './imagenes360', 
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = extname(file.originalname);
          callback(null, `${uniqueSuffix}${extension}`);
        },
      }),
    }),
    InmobiliariaModule,
  ],
  controllers: [Imagen360Controller],
  providers: [Imagen360Service],
  exports: [Imagen360Service],
})
export class Imagen360Module {}
