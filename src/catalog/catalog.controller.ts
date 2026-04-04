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

  // Sync inicial — poblar DB desde Odoo
  @Post('sync')
  async syncInicial() {
    return this.catalogService.syncInicial();
  }

  // Endpoint público — productos para Angular
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

  // Marcas disponibles para filtros
  @Get('marcas')
  async getMarcas() {
    return this.catalogService.getMarcas();
  }

  // Categorías disponibles para filtros
  @Get('categorias')
  async getCategorias() {
    return this.catalogService.getCategorias();
  }

  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getProductById(id);
  }
}
