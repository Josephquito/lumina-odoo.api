import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { OdooModule } from '../odoo/odoo.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [OdooModule, CatalogModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
