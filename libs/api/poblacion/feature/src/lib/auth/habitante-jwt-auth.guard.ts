import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de la sesión de autogestión del habitante (Fase 14). A diferencia de
 * `JwtAuthGuard` (staff), NO aplica globalmente — el guard global de la app
 * usa la estrategia 'jwt' (staff) y rechazaría un token de habitante por
 * secreto/estrategia distintos. Por eso toda ruta de autogestión se marca
 * `@Public()` (para saltarse el guard global) y aplica este guard explícito.
 */
@Injectable()
export class HabitanteJwtAuthGuard extends AuthGuard('jwt-habitante') {}
