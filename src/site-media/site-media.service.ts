import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SiteMediaService {
  private readonly logger = new Logger(SiteMediaService.name);

  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async getByKey(key: string) {
    return this.prisma.siteMedia.findMany({
      where: { key },
      orderBy: { orden: 'asc' },
    });
  }

  async subir(key: string, file: Express.Multer.File, orden = 0) {
    const resultado = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `lumina/site/${key}`, resource_type: 'image' },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });

    this.logger.log(`✓ SiteMedia subida: ${resultado.secure_url}`);
    return this.prisma.siteMedia.create({
      data: { url: resultado.secure_url, orden, key },
    });
  }

  async eliminar(id: number) {
    const media = await this.prisma.siteMedia.findUnique({ where: { id } });
    if (!media) throw new Error('Imagen no encontrada');

    const publicId = media.url
      .split('/')
      .slice(-3)
      .join('/')
      .replace(/\.[^/.]+$/, '');

    await cloudinary.uploader.destroy(publicId);
    await this.prisma.siteMedia.delete({ where: { id } });
    return { ok: true };
  }

  async reordenar(items: { id: number; orden: number }[]) {
    await Promise.all(
      items.map((item) =>
        this.prisma.siteMedia.update({
          where: { id: item.id },
          data: { orden: item.orden },
        }),
      ),
    );
    return { ok: true };
  }
}
