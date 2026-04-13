import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from './../generated/prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('api/images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Patch('reorder')
  async reordenarImagenes(
    @Body() body: { items: { id: number; orden: number }[] },
  ) {
    return this.imagesService.reordenarImagenes(body.items);
  }

  @Post(':productoId')
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  async subirImagen(
    @Param('productoId', ParseIntPipe) productoId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('orden') orden?: string,
  ) {
    return this.imagesService.subirImagen(
      productoId,
      file,
      orden ? parseInt(orden) : 0,
    );
  }

  @Post(':productoId/bulk')
  @UseInterceptors(
    FilesInterceptor('imagenes', 10, { storage: memoryStorage() }),
  )
  async subirImagenes(
    @Param('productoId', ParseIntPipe) productoId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const resultados = await Promise.all(
      files.map((file, index) =>
        this.imagesService.subirImagen(productoId, file, index),
      ),
    );
    return { total: resultados.length, imagenes: resultados };
  }

  @Get(':productoId')
  async getImagenes(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.imagesService.getImagenes(productoId);
  }

  @Delete(':imagenId')
  async eliminarImagen(@Param('imagenId', ParseIntPipe) imagenId: number) {
    return this.imagesService.eliminarImagen(imagenId);
  }
}
