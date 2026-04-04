import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { OdooModule } from './odoo/odoo.module';
import { WebhookModule } from './webhook/webhook.module';
import { CatalogModule } from './catalog/catalog.module';
import { ImagesModule } from './images/images.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OdooModule,
    CatalogModule,
    WebhookModule,
    ImagesModule,
    AuthModule,
  ],
})
export class AppModule {}
