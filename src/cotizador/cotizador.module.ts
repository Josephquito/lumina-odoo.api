import { Module } from '@nestjs/common';
import { CotizadorController } from './cotizador.controller';
import { CotizadorService } from './cotizador.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CotizadorController],
  providers: [CotizadorService],
})
export class CotizadorModule {}
