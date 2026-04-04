import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('api/catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('sync')
  async syncInicial() {
    return this.catalogService.syncInicial();
  }

  // Catálogo público agrupado
  @Get('products')
  async getProducts(
    @Query('marca') marca?: string,
    @Query('categoria') categoria?: string,
    @Query('buscar') buscar?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.getProductosAgrupados({
      marca,
      categoria,
      buscar,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // Admin — todos los productos con filtros y sin agrupar
  @Get('products/all')
  async getAllProducts(
    @Query('marca') marca?: string,
    @Query('categoria') categoria?: string,
    @Query('buscar') buscar?: string,
    @Query('filtroExtra') filtroExtra?: string,
  ) {
    return this.catalogService.getAllProducts({
      marca,
      categoria,
      buscar,
      filtroExtra,
    });
  }

  // Admin — productos paginados con filtros extra
  @Get('products/admin')
  async getProductsAdmin(
    @Query('marca') marca?: string,
    @Query('categoria') categoria?: string,
    @Query('buscar') buscar?: string,
    @Query('filtroExtra') filtroExtra?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.getProductosAgrupados({
      marca,
      categoria,
      buscar,
      filtroExtra,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('marcas')
  async getMarcas() {
    return this.catalogService.getMarcas();
  }

  @Get('categorias')
  async getCategorias() {
    return this.catalogService.getCategorias();
  }

  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getProductById(id);
  }
}
