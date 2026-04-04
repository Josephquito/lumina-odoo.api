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
    // Odoo manda el ID del producto que cambió
    const odooId = body?._id || body?.id || body?.record_id;

    if (!odooId) {
      this.logger.warn('Webhook sin ID de producto');
      return { ok: false, mensaje: 'Sin ID de producto' };
    }

    this.logger.log(`Webhook recibido — producto Odoo ID: ${odooId}`);

    try {
      await this.catalog.syncProducto(odooId);
      return { ok: true, odooId };
    } catch (err: any) {
      this.logger.error(`✗ Error procesando webhook: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }
}
