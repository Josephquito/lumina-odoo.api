import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('odoo')
  async recibirWebhook(
    @Body() body: any,
    @Headers('x-odoo-secret') secret: string,
  ) {
    this.logger.log(`Webhook recibido: ${JSON.stringify(body)}`);
    return this.webhookService.procesarCambio(body);
  }
}
