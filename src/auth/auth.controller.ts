import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Rol } from './../generated/prisma/client';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // Solo ADMIN puede crear usuarios
  @Post('usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  async crearUsuario(
    @Body() body: { nombre: string; email: string; password: string; rol: Rol },
  ) {
    return this.authService.crearUsuario(body);
  }

  // Solo ADMIN puede ver todos los usuarios
  @Get('usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  async getUsuarios() {
    return this.authService.getUsuarios();
  }

  // Solo ADMIN puede activar/desactivar usuarios
  @Patch('usuarios/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  async toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.authService.toggleActivo(id);
  }

  @Patch('usuarios/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  async editarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre?: string; email?: string; rol?: Rol },
  ) {
    return this.authService.editarUsuario(id, body);
  }

  // Cualquier usuario autenticado puede cambiar su propia contraseña
  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async cambiarPassword(
    @Request() req: any,
    @Body() body: { passwordActual: string; passwordNuevo: string },
  ) {
    return this.authService.cambiarPassword(
      req.user.sub,
      body.passwordActual,
      body.passwordNuevo,
    );
  }

  @Delete('usuarios/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  async eliminarUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.authService.eliminarUsuario(id);
  }

  // Perfil del usuario autenticado
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    return req.user;
  }
}
