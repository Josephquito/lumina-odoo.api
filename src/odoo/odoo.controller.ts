import { Controller, Get } from '@nestjs/common';
import { OdooService } from './odoo.service';

@Controller('api')
export class OdooController {
  constructor(private readonly odooService: OdooService) {}

  @Get('products')
  async getProducts() {
    const data = await this.odooService.getProducts();
    return {
      total: data.length,
      updated_at: new Date().toISOString(),
      data,
    };
  }

  // Endpoint para obtener los campos de producto
  @Get('product-fields')
  async getFields() {
    return this.odooService.getProductFields();
  }
}
