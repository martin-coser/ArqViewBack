import { Controller, Post, UploadedFile, UseInterceptors, Body, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Imagen2dService } from './imagen2d.service';
import { UploadImagen2dDto } from './dto/upload-imagen2d.dto';

@Controller('imagen2d')
export class Imagen2dController {
  constructor(private readonly imagen2dService: Imagen2dService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImagen2dDto: UploadImagen2dDto,
  ): Promise<{ imageUrl: string }> {
    return this.imagen2dService.upload(file, uploadImagen2dDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT) // Retorna 204 No Content en caso de éxito
  async deleteImage(@Param('id') id: number): Promise<void> {
    await this.imagen2dService.remove(id);
  }

}