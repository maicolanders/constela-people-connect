import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { AsignacionRolUsuario, RefreshToken, Usuario, UsuarioAutenticado, UsuarioRol } from '@censo/api-auth-data-access';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { JwtPayload } from '../strategies/jwt.strategy';
import { fechaExpiracionDesde, segundosDesdeExpresion } from '../util/duracion.util';

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

const RONDAS_BCRYPT = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(UsuarioRol) private readonly usuarioRolRepository: Repository<UsuarioRol>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async login(email: string, password: string): Promise<ParDeTokens> {
    const usuario = await this.usuarioRepository.findOne({ where: { email } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const hash = await bcrypt.hash(password, RONDAS_BCRYPT);
    console.log(hash, password);
    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const asignaciones = await this.obtenerAsignaciones(usuario.id);
    return this.emitirTokens(usuario, asignaciones);
  }

  async refrescar(refreshTokenPlano: string): Promise<ParDeTokens> {
    // Nota de escala: recorre todos los refresh tokens vigentes y compara con
    // bcrypt uno a uno. Aceptable para el volumen de Fase 0; si el número de
    // sesiones concurrentes crece, cambiar a un esquema id.secreto para
    // localizar el registro por índice antes de comparar el hash.
    const tokens = await this.refreshTokenRepository.find({ where: { revokedAt: IsNull() } });
    const tokenVigente = await this.buscarTokenCoincidente(tokens, refreshTokenPlano);

    if (!tokenVigente || tokenVigente.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    tokenVigente.revokedAt = new Date();
    await this.refreshTokenRepository.save(tokenVigente);

    const usuario = await this.usuarioRepository.findOne({ where: { id: tokenVigente.usuarioId } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }

    const asignaciones = await this.obtenerAsignaciones(usuario.id);
    return this.emitirTokens(usuario, asignaciones);
  }

  async obtenerPerfil(usuarioId: number): Promise<UsuarioAutenticado> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new UnauthorizedException('Usuario inexistente');
    }
    const asignaciones = await this.obtenerAsignaciones(usuarioId);
    return {
      id: usuario.id,
      email: usuario.email,
      roles: asignaciones.map((asignacion) => asignacion.rol),
      asignaciones,
    };
  }

  private async obtenerAsignaciones(usuarioId: number): Promise<AsignacionRolUsuario[]> {
    const usuarioRoles = await this.usuarioRolRepository.find({ where: { usuarioId }, relations: { rol: true } });
    return usuarioRoles.map((usuarioRol) => {
      if (!usuarioRol.rol) {
        throw new Error(`usuario_roles.id=${usuarioRol.id} sin relación rol cargada`);
      }
      return { rol: usuarioRol.rol.codigo, comunidadId: usuarioRol.comunidadId };
    });
  }

  private async emitirTokens(usuario: Usuario, asignaciones: AsignacionRolUsuario[]): Promise<ParDeTokens> {
    const payload: JwtPayload = { sub: usuario.id, email: usuario.email, asignaciones };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'change-me-access-secret'),
      expiresIn: segundosDesdeExpresion(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')),
    });

    const refreshTokenPlano = randomBytes(48).toString('hex');
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        usuarioId: usuario.id,
        tokenHash: await bcrypt.hash(refreshTokenPlano, RONDAS_BCRYPT),
        expiresAt: fechaExpiracionDesde(refreshTokenExpiresIn),
        revokedAt: null,
      }),
    );

    return { accessToken, refreshToken: refreshTokenPlano };
  }

  private async buscarTokenCoincidente(tokens: RefreshToken[], refreshTokenPlano: string): Promise<RefreshToken | null> {
    for (const token of tokens) {
      if (await bcrypt.compare(refreshTokenPlano, token.tokenHash)) {
        return token;
      }
    }
    return null;
  }

}
