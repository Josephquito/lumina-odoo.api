import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  // Sube imagen a Cloudinary y guarda URL en DB
  async subirImagen(
    productoId: number,
    file: Express.Multer.File,
    orden: number = 0,
  ) {
    // Subir a Cloudinary
    const resultado = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `lumina/productos/${productoId}`,
          resource_type: 'image',
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });

    this.logger.log(`✓ Imagen subida a Cloudinary: ${resultado.secure_url}`);

    // Guardar URL en PostgreSQL
    const imagen = await this.prisma.productoImagen.create({
      data: {
        url: resultado.secure_url,
        orden,
        productoId,
      },
    });

    return imagen;
  }

  // Obtener imágenes de un producto
  async getImagenes(productoId: number) {
    return this.prisma.productoImagen.findMany({
      where: { productoId },
      orderBy: { orden: 'asc' },
    });
  }

  // Eliminar imagen
  async eliminarImagen(imagenId: number) {
    const imagen = await this.prisma.productoImagen.findUnique({
      where: { id: imagenId },
    });

    if (!imagen) throw new Error('Imagen no encontrada');

    // Extraer public_id de la URL de Cloudinary para eliminarla
    const publicId = imagen.url
      .split('/')
      .slice(-3)
      .join('/')
      .replace(/\.[^/.]+$/, '');

    await cloudinary.uploader.destroy(publicId);
    await this.prisma.productoImagen.delete({ where: { id: imagenId } });

    this.logger.log(`✓ Imagen eliminada: ${imagenId}`);
    return { ok: true };
  }

  // Reordenar imágenes
  async reordenarImagenes(ordenes: { id: number; orden: number }[]) {
    await Promise.all(
      ordenes.map((o) =>
        this.prisma.productoImagen.update({
          where: { id: o.id },
          data: { orden: o.orden },
        }),
      ),
    );
    return { ok: true };
  }
}
