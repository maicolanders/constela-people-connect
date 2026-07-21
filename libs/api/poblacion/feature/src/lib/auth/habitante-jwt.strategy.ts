import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Habitante } from '@censo/api-poblacion-data-access';
import { EstadoHabitante } from '@censo/shared-data-access';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { HabitanteAutenticado } from './habitante-autenticado';
import { HabitanteJwtPayload } from './habitante-jwt-payload';

/**
 * Estrategia Passport nombrada explícitamente 'jwt-habitante' (nunca 'jwt',
 * la que usa el staff) y con secreto propio (`JWT_HABITANTE_ACCESS_SECRET`,
 * distinto de `JWT_ACCESS_SECRET`) — un token de un actor nunca es válido
 * para el otro, ni siquiera si alguien intenta reusarlo a propósito.
 */
@Injectable()
export class HabitanteJwtStrategy extends PassportStrategy(Strategy, 'jwt-habitante') {
  constructor(
    configService: ConfigService,
    @InjectRepository(Habitante) private readonly habitanteRepository: Repository<Habitante>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_HABITANTE_ACCESS_SECRET', 'change-me-habitante-access-secret'),
    });
  }

  /**
   * A diferencia de `JwtStrategy` (staff, que confía en los roles/asignaciones
   * embebidos en el payload), aquí SIEMPRE se relee el habitante desde BD:
   * `Habitante.estado` puede pasar a `baja` en cualquier momento (RF-01-02) y
   * la sesión de autogestión debe dejar de funcionar de inmediato, no esperar
   * a que expire el access token.
   */
  async validate(payload: HabitanteJwtPayload): Promise<HabitanteAutenticado> {
    const habitante = await this.habitanteRepository.findOne({ where: { id: payload.sub } });
    if (!habitante || !habitante.credencialActiva || habitante.estado !== EstadoHabitante.ACTIVO) {
      throw new UnauthorizedException('Sesión inválida');
    }
    return { habitanteId: habitante.id, comunidadId: habitante.comunidadId, hogarId: habitante.hogarId };
  }
}
