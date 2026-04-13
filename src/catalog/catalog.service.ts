import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OdooService } from '../odoo/odoo.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CatalogService {
  @Cron('0 0 */2 * * *') // cada 2 horas
  async cronSyncStock() {
    this.logger.log('Cron: sincronizando stock de todos los productos...');
    try {
      const result = await this.syncInicial();
      this.logger.log(
        `Cron completado: ${result.actualizados} actualizados, ${result.errores} errores`,
      );
    } catch (err: any) {
      this.logger.error(`Cron fallido: ${err.message}`);
    }
  }

  private readonly logger = new Logger(CatalogService.name);

  private readonly categoriasMap: Record<string, string> = {
    shampoo: 'Shampoo',
    acondicionador: 'Acondicionador',
    tratamiento_capilar: 'Tratamiento capilar',
    styling: 'Styling capilar',
    base: 'Base de maquillaje',
    ojos: 'Ojos (sombras, delineador, rímel, cejas)',
    polvo: 'Polvo compacto',
    rubor_iluminador: 'Rubor / Iluminador',
    primer_corrector: 'Primer / Corrector',
    labial: 'Labial',
    gloss: 'Gloss / Brillo labial',
    unas: 'Uñas (esmaltes, bases, tratamientos)',
    limpieza_facial: 'Limpieza facial',
    hidratacion_facial: 'Hidratación facial',
    cuerpo: 'Cuerpo',
    accesorios: 'Accesorios',
  };

  constructor(
    private prisma: PrismaService,
    private odoo: OdooService,
  ) {}

  // ─── Privados ────────────────────────────────────────────────────────────────

  private resolverCategoria(valor: any): string | null {
    if (!valor || typeof valor !== 'string' || !valor.trim()) return null;
    return this.categoriasMap[valor.trim()] || valor.trim();
  }

  private aplicarFiltroExtra(where: any, filtroExtra?: string) {
    switch (filtroExtra) {
      case 'sin_imagen':
        where.imagenes = { none: {} };
        break;
      case 'sin_descripcion':
        where.descripcionCorta = null;
        where.descripcionLarga = null;
        break;
      case 'sin_categoria':
        where.categoriaId = null;
        break;
      case 'sin_sku':
        where.sku = null;
        break;
      case 'sin_nombre_web':
        where.grupoVariante = null;
        break;
    }
  }

  private agruparProductos(todos: any[]): any[] {
    const mapaGrupos = new Map<string, any>();
    const sinGrupo: any[] = [];

    for (const producto of todos) {
      const grupo = producto.grupoVariante?.trim();
      if (grupo) {
        if (!mapaGrupos.has(grupo)) {
          mapaGrupos.set(grupo, {
            ...producto,
            nombreWeb: grupo,
            variantes: [producto],
            stock: 0,
          });
        } else {
          mapaGrupos.get(grupo).variantes.push(producto);
        }
      } else {
        sinGrupo.push(producto);
      }
    }

    const resultado: any[] = [];

    for (const [, grupo] of mapaGrupos) {
      // Stock: suma solo variantes con stock > 0
      grupo.stock = grupo.variantes
        .filter((v: any) => v.stock > 0)
        .reduce((acc: number, v: any) => acc + v.stock, 0);

      // Imagen: cualquier variante del grupo, con o sin stock
      const conImagen = grupo.variantes.filter((v: any) => v.imagenes?.length);
      if (conImagen.length) grupo.imagenes = conImagen[0].imagenes;

      // SKU: menor lexicográfico de variantes con stock > 0
      const skus = grupo.variantes
        .filter((v: any) => v.stock > 0)
        .map((v: any) => v.sku)
        .filter(Boolean)
        .sort();
      grupo.sku = skus[0] ?? null;

      // Precio: menor de variantes con stock > 0
      const precios = grupo.variantes
        .filter((v: any) => v.stock > 0)
        .map((v: any) => v.precio);
      grupo.precio = precios.length ? Math.min(...precios) : grupo.precio;

      // Solo incluir el grupo si tiene al menos una variante con stock
      if (grupo.stock > 0) resultado.push(grupo);
    }

    const sinGrupoConStock = sinGrupo.filter((p) => p.stock > 0);

    return [...resultado, ...sinGrupoConStock];
  }

  private calcularPrecioConIva(product: any, taxMap: Map<number, any>): number {
    if (!product.taxes_id?.length) return product.list_price;
    let precio = product.list_price;
    for (const taxId of product.taxes_id) {
      const tax = taxMap.get(taxId);
      if (!tax) continue;
      if (tax.amount_type === 'percent' && !tax.price_include) {
        precio = precio * (1 + tax.amount / 100);
      }
    }
    return Math.round(precio * 100) / 100;
  }

  private extraerMarca(product: any, posCategMap: Map<number, string>): string {
    if (!product.pos_categ_ids) return '';
    if (typeof product.pos_categ_ids === 'string') return product.pos_categ_ids;
    if (
      Array.isArray(product.pos_categ_ids) &&
      product.pos_categ_ids.length > 0
    ) {
      const primera = product.pos_categ_ids[0];
      if (typeof primera === 'number') return posCategMap.get(primera) || '';
      if (Array.isArray(primera)) return primera[1] || '';
      if (typeof primera === 'string') return primera;
    }
    return '';
  }

  // ─── Sync ────────────────────────────────────────────────────────────────────

  async syncInicial() {
    this.logger.log('Iniciando sync inicial Odoo → PostgreSQL...');

    const products = await this.odoo.getProducts();

    const allPosCategIds = [
      ...new Set(
        products
          .flatMap((p) =>
            Array.isArray(p.pos_categ_ids) ? p.pos_categ_ids : [],
          )
          .filter((id) => typeof id === 'number'),
      ),
    ];
    const posCategs = allPosCategIds.length
      ? await this.odoo.getPosCategories(allPosCategIds)
      : [];
    const posCategMap = new Map<number, string>();
    for (const cat of posCategs) posCategMap.set(cat.id, cat.name);

    const allTaxIds = [...new Set(products.flatMap((p) => p.taxes_id || []))];
    const taxes = allTaxIds.length
      ? await this.odoo.getTaxDetails(allTaxIds)
      : [];
    const taxMap = new Map<number, any>();
    for (const tax of taxes) taxMap.set(tax.id, tax);

    let creados = 0;
    let actualizados = 0;
    let errores = 0;

    for (const product of products) {
      try {
        const precio = this.calcularPrecioConIva(product, taxMap);

        const marcaNombre = this.extraerMarca(product, posCategMap);
        let marcaId: number | null = null;
        if (marcaNombre) {
          const marca = await this.prisma.marca.upsert({
            where: { nombre: marcaNombre },
            create: { nombre: marcaNombre },
            update: {},
          });
          marcaId = marca.id;
        }

        let categoriaId: number | null = null;
        const nombreCategoria = this.resolverCategoria(product.x_categoria_web);
        if (nombreCategoria) {
          const categoria = await this.prisma.categoria.upsert({
            where: { nombre: nombreCategoria },
            create: { nombre: nombreCategoria },
            update: {},
          });
          categoriaId = categoria.id;
        }

        const nombreWeb =
          product.x_grupo_variante &&
          typeof product.x_grupo_variante === 'string' &&
          product.x_grupo_variante.trim()
            ? product.x_grupo_variante.trim()
            : product.name;

        const datos = {
          nombre: product.name,
          nombreWeb,
          descripcionCorta: product.description_sale || null,
          descripcionLarga: product.x_descripcion_web || null,
          precio,
          precioBase: product.list_price,
          sku: product.barcode || null,
          stock: Number(product.qty_available) || 0,
          publicarWeb: product.x_publicar_web ?? false,
          grupoVariante: product.x_grupo_variante || null,
          odooWriteDate: product.write_date
            ? new Date(product.write_date)
            : null,
          marcaId,
          categoriaId,
        };

        const resultado = await this.prisma.producto.upsert({
          where: { odooId: product.id },
          create: { odooId: product.id, ...datos },
          update: datos,
        });

        if (resultado.creadoEn === resultado.actualizadoEn) {
          creados++;
        } else {
          actualizados++;
        }
      } catch (err: any) {
        errores++;
        this.logger.error(`✗ Error en "${product.name}": ${err.message}`);
      }
    }

    this.logger.log(
      `Sync completado: ${creados} creados, ${actualizados} actualizados, ${errores} errores`,
    );
    return {
      total: products.length,
      creados,
      actualizados,
      errores,
      finished_at: new Date().toISOString(),
    };
  }

  async syncProducto(odooId: number) {
    const productos = await this.odoo.getProductoById(odooId);

    if (!productos?.length) {
      this.logger.warn(`Producto ${odooId} no encontrado en Odoo`);
      return null;
    }

    const product = productos[0];

    const allPosCategIds = Array.isArray(product.pos_categ_ids)
      ? product.pos_categ_ids.filter((id: any) => typeof id === 'number')
      : [];
    const posCategs = allPosCategIds.length
      ? await this.odoo.getPosCategories(allPosCategIds)
      : [];
    const posCategMap = new Map<number, string>();
    for (const cat of posCategs) posCategMap.set(cat.id, cat.name);

    const taxes = product.taxes_id?.length
      ? await this.odoo.getTaxDetails(product.taxes_id)
      : [];
    const taxMap = new Map<number, any>();
    for (const tax of taxes) taxMap.set(tax.id, tax);

    const precio = this.calcularPrecioConIva(product, taxMap);

    const marcaNombre = this.extraerMarca(product, posCategMap);
    let marcaId: number | null = null;
    if (marcaNombre) {
      const marca = await this.prisma.marca.upsert({
        where: { nombre: marcaNombre },
        create: { nombre: marcaNombre },
        update: {},
      });
      marcaId = marca.id;
    }

    let categoriaId: number | null = null;
    const nombreCategoria = this.resolverCategoria(product.x_categoria_web);
    if (nombreCategoria) {
      const categoria = await this.prisma.categoria.upsert({
        where: { nombre: nombreCategoria },
        create: { nombre: nombreCategoria },
        update: {},
      });
      categoriaId = categoria.id;
    }

    const nombreWeb =
      product.x_grupo_variante &&
      typeof product.x_grupo_variante === 'string' &&
      product.x_grupo_variante.trim()
        ? product.x_grupo_variante.trim()
        : product.name;

    const datos = {
      nombre: product.name,
      nombreWeb,
      descripcionCorta: product.description_sale || null,
      descripcionLarga: product.x_descripcion_web || null,
      precio,
      precioBase: product.list_price,
      sku: product.barcode || null,
      stock: Number(product.qty_available) || 0,
      publicarWeb: product.x_publicar_web ?? false,
      grupoVariante: product.x_grupo_variante || null,
      odooWriteDate: product.write_date ? new Date(product.write_date) : null,
      marcaId,
      categoriaId,
    };

    const resultado = await this.prisma.producto.upsert({
      where: { odooId },
      create: { odooId, ...datos },
      update: datos,
    });

    this.logger.log(`✓ Producto sincronizado via webhook: ${nombreWeb}`);
    return resultado;
  }

  // ─── Queries públicas ─────────────────────────────────────────────────────────

  async getProducts(filtros: {
    marca?: string;
    categoria?: string;
    buscar?: string;
    filtroExtra?: string;
    page: number;
    limit: number;
  }) {
    const { marca, categoria, buscar, filtroExtra, page, limit } = filtros;
    const skip = (page - 1) * limit;

    const where: any = {
      publicarWeb: true,
      stock: { gt: 0 },
      sku: { not: null },
    };
    if (marca) where.marca = { nombre: { equals: marca, mode: 'insensitive' } };
    if (categoria)
      where.categoria = {
        nombre: { equals: categoria, mode: 'insensitive' },
      };
    if (buscar) {
      where.OR = [
        { nombreWeb: { contains: buscar, mode: 'insensitive' } },
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { sku: { contains: buscar } },
      ];
    }
    this.aplicarFiltroExtra(where, filtroExtra);

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombreWeb: 'asc' },
        include: { marca: true, categoria: true, imagenes: true },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: productos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
  private aplicarFiltroExtraAgrupado(
    productos: any[],
    filtroExtra?: string,
  ): any[] {
    switch (filtroExtra) {
      case 'sin_imagen':
        return productos.filter((p) => !p.imagenes?.length);
      case 'sin_descripcion':
        return productos.filter(
          (p) => !p.descripcionCorta && !p.descripcionLarga,
        );
      case 'sin_categoria':
        return productos.filter((p) => !p.categoriaId);
      case 'sin_sku':
        return productos.filter((p) => !p.sku);
      case 'sin_nombre_web':
        return productos.filter((p) => !p.grupoVariante);
      default:
        return productos;
    }
  }

  async getAllProducts(filtros: {
    marca?: string;
    categoria?: string;
    buscar?: string;
    filtroExtra?: string;
  }) {
    const { marca, categoria, buscar, filtroExtra } = filtros;

    const where: any = {
      publicarWeb: true,
      sku: { not: null },
    };
    if (marca) where.marca = { nombre: { equals: marca, mode: 'insensitive' } };
    if (categoria)
      where.categoria = { nombre: { equals: categoria, mode: 'insensitive' } };
    if (buscar) {
      where.OR = [
        { nombreWeb: { contains: buscar, mode: 'insensitive' } },
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { sku: { contains: buscar } },
      ];
    }

    const todos = await this.prisma.producto.findMany({
      where,
      orderBy: { nombreWeb: 'asc' },
      include: {
        marca: true,
        categoria: true,
        imagenes: { orderBy: { orden: 'asc' } },
      },
    });

    const agrupados = this.agruparProductos(todos);
    const filtrados = this.aplicarFiltroExtraAgrupado(agrupados, filtroExtra);

    filtrados.sort((a, b) =>
      (a.nombreWeb || a.nombre).localeCompare(b.nombreWeb || b.nombre),
    );

    return filtrados;
  }

  async getProductosAgrupados(filtros: {
    marca?: string;
    categoria?: string;
    buscar?: string;
    filtroExtra?: string;
    page: number;
    limit: number;
  }) {
    const { marca, categoria, buscar, filtroExtra, page, limit } = filtros;

    const where: any = {
      publicarWeb: true,
      sku: { not: null },
    };
    if (marca) where.marca = { nombre: { equals: marca, mode: 'insensitive' } };
    if (categoria)
      where.categoria = { nombre: { equals: categoria, mode: 'insensitive' } };

    const todos = await this.prisma.producto.findMany({
      where,
      orderBy: { nombreWeb: 'asc' },
      include: {
        marca: true,
        categoria: true,
        imagenes: { orderBy: { orden: 'asc' } },
      },
    });

    const agrupados = this.agruparProductos(todos);

    const filtradosBuscar = buscar
      ? agrupados.filter(
          (p) =>
            p.nombreWeb?.toLowerCase().includes(buscar.toLowerCase()) ||
            p.nombre?.toLowerCase().includes(buscar.toLowerCase()) ||
            p.sku?.includes(buscar),
        )
      : agrupados;

    const filtrados = this.aplicarFiltroExtraAgrupado(
      filtradosBuscar,
      filtroExtra,
    );

    filtrados.sort((a, b) =>
      (a.nombreWeb || a.nombre).localeCompare(b.nombreWeb || b.nombre),
    );

    const marcasMap = new Map<number, { id: number; nombre: string }>();
    const categoriasMap = new Map<number, { id: number; nombre: string }>();

    for (const p of filtrados) {
      const variantes = p.variantes ?? [p];
      for (const v of variantes) {
        if (v.marca)
          marcasMap.set(v.marca.id, { id: v.marca.id, nombre: v.marca.nombre });
        if (v.categoria)
          categoriasMap.set(v.categoria.id, {
            id: v.categoria.id,
            nombre: v.categoria.nombre,
          });
      }
    }

    const marcasDisponibles = Array.from(marcasMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
    const categoriasDisponibles = Array.from(categoriasMap.values()).sort(
      (a, b) => a.nombre.localeCompare(b.nombre),
    );

    const total = filtrados.length;
    const skip = (page - 1) * limit;
    const data = filtrados.slice(skip, skip + limit);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      marcasDisponibles,
      categoriasDisponibles,
    };
  }

  async getMarcas() {
    return this.prisma.marca.findMany({
      where: {
        productos: {
          some: { publicarWeb: true, stock: { gt: 0 }, sku: { not: null } },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getCategorias() {
    return this.prisma.categoria.findMany({
      where: {
        productos: {
          some: { publicarWeb: true, stock: { gt: 0 }, sku: { not: null } },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getProductById(id: number) {
    return this.prisma.producto.findUnique({
      where: { id },
      include: {
        marca: true,
        categoria: true,
        imagenes: { orderBy: { orden: 'asc' } },
      },
    });
  }

  async syncProductoPorVariante(variantId: number) {
    const productos = await this.odoo.getProductoByVariantId(variantId);
    if (!productos?.length) {
      this.logger.warn(`No se encontró template para variante ${variantId}`);
      return null;
    }
    return this.syncProducto(productos[0].id);
  }
}
