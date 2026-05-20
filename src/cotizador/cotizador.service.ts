import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CotizadorService {
  constructor(private prisma: PrismaService) {}

  async buscarProductos(q: string) {
    if (!q || q.trim().length < 2) return [];

    const productos = await this.prisma.producto.findMany({
      where: {
        publicarWeb: true,
        stock: { gt: 0 },
        sku: { not: null },
        OR: [
          { nombreWeb: { contains: q, mode: 'insensitive' } },
          { nombre: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { marca: { nombre: { contains: q, mode: 'insensitive' } } },
          { categoria: { nombre: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: 15,
      orderBy: { nombreWeb: 'asc' },
      include: { marca: true },
    });

    const mapaGrupos = new Map<string, any>();
    const sinGrupo: any[] = [];

    for (const p of productos) {
      const grupo = p.grupoVariante?.trim();
      if (grupo) {
        if (!mapaGrupos.has(grupo)) {
          mapaGrupos.set(grupo, { ...p, nombreWeb: grupo, variantes: [p] });
        } else {
          mapaGrupos.get(grupo).variantes.push(p);
        }
      } else {
        sinGrupo.push(p);
      }
    }

    const resultado: any[] = [];

    for (const [, grupo] of mapaGrupos) {
      const skus = grupo.variantes
        .filter((v: any) => v.stock > 0)
        .map((v: any) => v.sku)
        .filter(Boolean)
        .sort();
      const precios = grupo.variantes
        .filter((v: any) => v.stock > 0)
        .map((v: any) => v.precio);

      resultado.push({
        id: grupo.id,
        nombreWeb: grupo.nombreWeb,
        marca: grupo.marca,
        precio: precios.length ? Math.min(...precios) : grupo.precio,
        sku: skus[0] ?? null,
        stock: grupo.variantes
          .filter((v: any) => v.stock > 0)
          .reduce((acc: number, v: any) => acc + v.stock, 0),
      });
    }

    return [
      ...resultado,
      ...sinGrupo.map((p) => ({
        id: p.id,
        nombreWeb: p.nombreWeb || p.nombre,
        marca: p.marca,
        precio: p.precio,
        sku: p.sku,
        stock: p.stock,
      })),
    ];
  }

  async getTarifas() {
    return this.prisma.tarifaEnvio.findMany({ orderBy: { id: 'asc' } });
  }

  async createTarifa(destino: string, tarifa: number) {
    return this.prisma.tarifaEnvio.create({ data: { destino, tarifa } });
  }

  async updateTarifa(id: number, destino: string, tarifa: number) {
    return this.prisma.tarifaEnvio.update({
      where: { id },
      data: { destino, tarifa },
    });
  }

  async deleteTarifa(id: number) {
    return this.prisma.tarifaEnvio.delete({ where: { id } });
  }
}
