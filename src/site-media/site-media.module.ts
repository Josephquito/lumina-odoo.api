import { Module } from '@nestjs/common';
import { SiteMediaService } from './site-media.service';
import { SiteMediaController } from './site-media.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SiteMediaController],
  providers: [SiteMediaService],
})
export class SiteMediaModule {}
