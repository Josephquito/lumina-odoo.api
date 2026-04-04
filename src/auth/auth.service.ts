import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Rol } from '../../generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    return {
      access_token: this.jwt.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  async crearUsuario(data: {
    nombre: string;
    email: string;
    password: string;
    rol: Rol;
  }) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existe) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(data.password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: hash,
        rol: data.rol,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
    });

    return usuario;
  }

  async getUsuarios() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async toggleActivo(id: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: !usuario.activo },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    });
  }

  async editarUsuario(
    id: number,
    data: { nombre?: string; email?: string; rol?: Rol },
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (data.email && data.email !== usuario.email) {
      const existe = await this.prisma.usuario.findUnique({
        where: { email: data.email },
      });
      if (existe) throw new ConflictException('El email ya está registrado');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.email && { email: data.email }),
        ...(data.rol && { rol: data.rol }),
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
      },
    });
  }

  async cambiarPassword(
    id: number,
    passwordActual: string,
    passwordNuevo: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const valido = await bcrypt.compare(passwordActual, usuario.password);
    if (!valido)
      throw new UnauthorizedException('Contraseña actual incorrecta');

    const hash = await bcrypt.hash(passwordNuevo, 10);
    await this.prisma.usuario.update({
      where: { id },
      data: { password: hash },
    });

    return { ok: true, mensaje: 'Contraseña actualizada' };
  }

  async seedAdmin() {
    const email = process.env.ADMIN_EMAIL!;
    const existe = await this.prisma.usuario.findUnique({ where: { email } });
    if (existe) return;

    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);
    await this.prisma.usuario.create({
      data: {
        nombre: process.env.ADMIN_NOMBRE!,
        email,
        password: hash,
        rol: Rol.ADMIN,
        activo: true,
      },
    });

    console.log(`✓ Admin creado: ${email}`);
  }

  async eliminarUsuario(id: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Proteger al admin principal
    if (usuario.email === process.env.ADMIN_EMAIL) {
      throw new ConflictException(
        'No se puede eliminar el administrador principal',
      );
    }

    await this.prisma.usuario.delete({ where: { id } });
    return { ok: true, mensaje: 'Usuario eliminado' };
  }
}
