import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Habitante, HabitanteRefreshToken } from '@censo/api-poblacion-data-access';
import { EstadoHabitante } from '@censo/shared-data-access';
import { calcularEdad } from '@censo/shared-util';
import { fechaExpiracionDesde, segundosDesdeExpresion } from '@censo/api-auth-feature';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { LoginHabitanteDto } from '../dto/login-habitante.dto';
import { RegistroHabitanteDto } from '../dto/registro-habitante.dto';
import { HabitanteJwtPayload } from './habitante-jwt-payload';

export interface ParDeTokensHabitante {
  accessToken: string;
  refreshToken: string;
}

const RONDAS_BCRYPT = 12;
const EDAD_MINIMA_AUTOGESTION = 18;

/**
 * Autenticación de autogestión del habitante (Fase 14): login por
 * documento+contraseña, no por email — un `Habitante` no es un `Usuario`
 * (auth de staff). `(tipoDocumentoId, numeroDocumento)` es único POR
 * COMUNIDAD (índice de `habitantes`), no globalmente, y el formulario de
 * registro/login no pide comunidad — por eso ambos flujos iteran candidatos
 * en vez de esperar una única fila.
 */
@Injectable()
export class HabitanteAuthService {
  constructor(
    @InjectRepository(Habitante) private readonly habitanteRepository: Repository<Habitante>,
    @InjectRepository(HabitanteRefreshToken) private readonly refreshTokenRepository: Repository<HabitanteRefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registrar(dto: RegistroHabitanteDto): Promise<{ habitanteId: number }> {
    const candidatos = await this.habitanteRepository.find({
      where: {
        tipoDocumentoId: dto.tipoDocumentoId,
        numeroDocumento: dto.numeroDocumento,
        estado: EstadoHabitante.ACTIVO,
      },
    });

    // 2do factor de verificación: la fecha de nacimiento, porque el documento
    // no es único globalmente (solo por comunidad) y el formulario de
    // registro no pide comunidad.
    const coincidencias = candidatos.filter((habitante) => habitante.fechaNacimiento === dto.fechaNacimiento);

    if (coincidencias.length === 0) {
      throw new UnauthorizedException('Documento o fecha de nacimiento no coinciden con ningún registro censal');
    }
    if (coincidencias.length > 1) {
      // Colisión real de documento+fecha de nacimiento entre comunidades distintas:
      // caso extremadamente raro, no resuelto automáticamente en esta fase.
      throw new ConflictException('Existen varios registros censales que coinciden; contacte al censista de su comunidad');
    }

    const habitante = coincidencias[0];
    if (calcularEdad(new Date(habitante.fechaNacimiento)) < EDAD_MINIMA_AUTOGESTION) {
      throw new ForbiddenException('El autoregistro solo está disponible para mayores de edad');
    }
    if (habitante.credencialActiva) {
      throw new ConflictException('Ya existe una credencial activa para este habitante; use iniciar sesión');
    }

    habitante.passwordHash = await bcrypt.hash(dto.passwordNueva, RONDAS_BCRYPT);
    habitante.credencialActiva = true;
    await this.habitanteRepository.save(habitante);

    return { habitanteId: habitante.id };
  }

  async login(dto: LoginHabitanteDto): Promise<ParDeTokensHabitante> {
    const candidatos = await this.habitanteRepository.find({
      where: { tipoDocumentoId: dto.tipoDocumentoId, numeroDocumento: dto.numeroDocumento, credencialActiva: true },
    });

    let habitante: Habitante | null = null;
    for (const candidato of candidatos) {
      if (candidato.passwordHash && (await bcrypt.compare(dto.password, candidato.passwordHash))) {
        habitante = candidato;
        break;
      }
    }

    if (!habitante || habitante.estado !== EstadoHabitante.ACTIVO) {
      // Nunca revelar si el motivo específico es "dado de baja" vs. "no existe".
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.emitirTokens(habitante);
  }

  async refrescar(refreshTokenPlano: string): Promise<ParDeTokensHabitante> {
    const tokens = await this.refreshTokenRepository.find({ where: { revokedAt: IsNull() } });
    const tokenVigente = await this.buscarTokenCoincidente(tokens, refreshTokenPlano);

    if (!tokenVigente || tokenVigente.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    tokenVigente.revokedAt = new Date();
    await this.refreshTokenRepository.save(tokenVigente);

    const habitante = await this.habitanteRepository.findOne({ where: { id: tokenVigente.habitanteId } });
    // A diferencia de Usuario.activo (staff), Habitante.estado/credencialActiva
    // pueden cambiar durante la vida de la sesión — se re-verifican en cada refresh.
    if (!habitante || !habitante.credencialActiva || habitante.estado !== EstadoHabitante.ACTIVO) {
      throw new UnauthorizedException('Sesión inválida');
    }

    return this.emitirTokens(habitante);
  }

  private async emitirTokens(habitante: Habitante): Promise<ParDeTokensHabitante> {
    const payload: HabitanteJwtPayload = { sub: habitante.id, comunidadId: habitante.comunidadId, hogarId: habitante.hogarId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_HABITANTE_ACCESS_SECRET', 'change-me-habitante-access-secret'),
      expiresIn: segundosDesdeExpresion(this.configService.get<string>('JWT_HABITANTE_ACCESS_EXPIRES_IN', '15m')),
    });

    const refreshTokenPlano = randomBytes(48).toString('hex');
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_HABITANTE_REFRESH_EXPIRES_IN', '7d');

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        habitanteId: habitante.id,
        tokenHash: await bcrypt.hash(refreshTokenPlano, RONDAS_BCRYPT),
        expiresAt: fechaExpiracionDesde(refreshTokenExpiresIn),
        revokedAt: null,
      }),
    );

    return { accessToken, refreshToken: refreshTokenPlano };
  }

  private async buscarTokenCoincidente(
    tokens: HabitanteRefreshToken[],
    refreshTokenPlano: string,
  ): Promise<HabitanteRefreshToken | null> {
    for (const token of tokens) {
      if (await bcrypt.compare(refreshTokenPlano, token.tokenHash)) {
        return token;
      }
    }
    return null;
  }
}
