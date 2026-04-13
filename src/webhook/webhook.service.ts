import { Injectable, Logger } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { OdooService } from '../odoo/odoo.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private catalog: CatalogService,
    private odoo: OdooService,
  ) {}

  async procesarCambio(body: any) {
    const odooId = body?._id || body?.id || body?.record_id;
    const productVariantId = body?.product_id;

    if (!odooId && !productVariantId) {
      this.logger.warn('Webhook sin ID de producto');
      return { ok: false, mensaje: 'Sin ID de producto' };
    }

    this.logger.log(
      `Webhook recibido — ID: ${odooId}, variantId: ${productVariantId}`,
    );

    try {
      if (productVariantId) {
        await this.catalog.syncProductoPorVariante(productVariantId);
      } else {
        await this.catalog.syncProducto(odooId);
      }
      return { ok: true };
    } catch (err: any) {
      this.logger.error(`✗ Error procesando webhook: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }
}
