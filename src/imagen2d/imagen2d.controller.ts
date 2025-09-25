import { Controller, Post, UploadedFile, UseInterceptors, Body, Delete, HttpCode, HttpStatus, Param, Patch, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Imagen2dService } from './imagen2d.service';
import { UploadImagen2dDto } from './dto/upload-imagen2d.dto';
import { Imagen2d } from './entities/imagen2d.entity';
import { Roles } from 'src/guards/decoradores/roles.decorator';

@Controller('imagen2d')
export class Imagen2dController {
  constructor(private readonly imagen2dService: Imagen2dService) { }

  @Get('/findByPropiedad/:id')
  @HttpCode(HttpStatus.OK)
  async findByPropiedad(@Param('id') id: number): Promise<Imagen2d[]> {
    return this.imagen2dService.findByPropiedad(id);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @Roles('INMOBILIARIA')
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImagen2dDto: UploadImagen2dDto,
  ): Promise<{ imageUrl: string }> {
    return this.imagen2dService.upload(file, uploadImagen2dDto);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('INMOBILIARIA')
  async updateImageDescription(
    @Param('id') id: number,
    @Body('descripcion') descripcion: string,
  ): Promise<Imagen2d> {
    return this.imagen2dService.updateDescription(id, descripcion);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('INMOBILIARIA')
  async deleteImage(@Param('id') id: number): Promise<void> {
    await this.imagen2dService.remove(id);
  }

}