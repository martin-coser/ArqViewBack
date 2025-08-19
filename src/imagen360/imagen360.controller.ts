import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { Imagen360Service } from './imagen360.service';
import { Imagen360 } from './entities/imagen360.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadImagen360Dto } from './dto/UploadImagen360Dto';

@Controller('imagen360')
export class Imagen360Controller {
  constructor(private readonly imagen360Service: Imagen360Service) {}

  // aplicar metodo findByPropiedad del servicio
  @Get('/findByPropiedad/:id')
  async findByPropiedad(@Param('id') id: number): Promise<Imagen360[]> {
    return this.imagen360Service.findByPropiedad(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImagen360Dto: UploadImagen360Dto,
  ): Promise<{ imageUrl: string }> {
    return this.imagen360Service.upload(file, uploadImagen360Dto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(@Param('id') id: number): Promise<void> {
    await this.imagen360Service.remove(id);
  }
}
