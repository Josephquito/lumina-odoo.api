import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SiteMediaService } from './site-media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../generated/prisma/client';

@Controller('api/site-media')
export class SiteMediaController {
  constructor(private readonly service: SiteMediaService) {}

  // Público — para mostrar en el frontend
  @Get()
  async getByKey(@Query('key') key: string) {
    return this.service.getByKey(key);
  }

  // Admin — subir, eliminar, reordenar
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  async subir(
    @Query('key') key: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('orden') orden?: string,
  ) {
    return this.service.subir(key, file, orden ? parseInt(orden) : 0);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Patch('reorder')
  async reordenar(@Body() body: { items: { id: number; orden: number }[] }) {
    return this.service.reordenar(body.items);
  }
}
