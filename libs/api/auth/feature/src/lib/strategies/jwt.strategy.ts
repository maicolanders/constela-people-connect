import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { AsignacionRolUsuario, Usuario, UsuarioAutenticado } from '@censo/api-auth-data-access';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

export interface JwtPayload {
  sub: number;
  email: string;
  asignaciones: AsignacionRolUsuario[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario) private readonly usuarioRepository: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET', 'change-me-access-secret'),
    });
  }

  /**
   * El access token vive poco (15m por defecto): confiamos en los roles y
   * asignaciones embebidos en el payload en vez de recalcularlos en cada
   * request, y solo verificamos que el usuario siga activo.
   */
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: payload.sub } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      roles: payload.asignaciones.map((asignacion) => asignacion.rol),
      asignaciones: payload.asignaciones,
    };
  }
}
