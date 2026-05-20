import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CotizadorService } from './cotizador.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/cotizador')
export class CotizadorController {
  constructor(private readonly cotizadorService: CotizadorService) {}

  @UseGuards(JwtAuthGuard)
  @Get('buscar')
  async buscar(@Query('q') q: string) {
    return this.cotizadorService.buscarProductos(q);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tarifas')
  async getTarifas() {
    return this.cotizadorService.getTarifas();
  }

  @UseGuards(JwtAuthGuard)
  @Post('tarifas')
  async createTarifa(@Body() body: { destino: string; tarifa: number }) {
    return this.cotizadorService.createTarifa(body.destino, body.tarifa);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tarifas/:id')
  async updateTarifa(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { destino: string; tarifa: number },
  ) {
    return this.cotizadorService.updateTarifa(id, body.destino, body.tarifa);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tarifas/:id')
  async deleteTarifa(@Param('id', ParseIntPipe) id: number) {
    return this.cotizadorService.deleteTarifa(id);
  }
}
