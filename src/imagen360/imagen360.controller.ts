import { Controller, Get, Post, Body, Param, Delete, UseInterceptors, UploadedFile, HttpCode, HttpStatus, Req, Patch } from '@nestjs/common';
import { Imagen360Service } from './imagen360.service';
import { Imagen360 } from './entities/imagen360.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadImagen360Dto } from './dto/UploadImagen360Dto';
import { Roles } from 'src/guards/decoradores/roles.decorator';
import { Planes } from 'src/guards/decoradores/planes.decorator';

@Controller('imagen360')
export class Imagen360Controller {
  constructor(private readonly imagen360Service: Imagen360Service) { }

  @Get('/findByPropiedad/:id')
  @HttpCode(HttpStatus.OK)
  async findByPropiedad(@Param('id') id: number, @Req() req): Promise<Imagen360[]> {
    const cuentaId = req.user.id;
    return this.imagen360Service.findByPropiedad(cuentaId, id);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @Roles('INMOBILIARIA')
  @Planes('PREMIUM')
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImagen360Dto: UploadImagen360Dto,
  ): Promise<{ imageUrl: string }> {
    return this.imagen360Service.upload(file, uploadImagen360Dto);
  }

  @Patch('/update/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('INMOBILIARIA')
  async updateImageDescription(
    @Param('id') id: number,
    @Body('descripcion') descripcion: string,
  ): Promise<Imagen360> {
    return this.imagen360Service.updateDescription(id, descripcion);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('INMOBILIARIA')
  async deleteImage(@Param('id') id: number): Promise<void> {
    await this.imagen360Service.remove(id);
  }
}
