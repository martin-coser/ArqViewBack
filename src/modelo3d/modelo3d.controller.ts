import { Controller, Post, UploadedFile, UseInterceptors, Body, Delete, HttpCode, HttpStatus, Param, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Modelo3DService } from './modelo3d.service';
import { UploadModelo3DDto } from './dto/upload-modelo3d.dto';
import { Modelo3D } from './entities/modelo3d.entity';

@Controller('modelo3d')
export class Modelo3DController {
  constructor(private readonly modelo3DService: Modelo3DService) {}

  // aplicar metodo findByPropiedad del servicio
  @Get('/findByPropiedad/:id')
  async findByPropiedad(@Param('id') id: number): Promise<Modelo3D[]> {
    return this.modelo3DService.findByPropiedad(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadModelo3DDto: UploadModelo3DDto,
  ): Promise<{ imageUrl: string }> {
    return this.modelo3DService.upload(file, uploadModelo3DDto);
  }

  @Delete('/remove/:id')
  @HttpCode(HttpStatus.NO_CONTENT) 
  async deleteImage(@Param('id') id: number): Promise<void> {
    await this.modelo3DService.remove(id);
  }

}