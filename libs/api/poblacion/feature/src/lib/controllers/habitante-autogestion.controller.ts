import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { Public } from '@censo/api-auth-feature';
import { Habitante, Hogar } from '@censo/api-poblacion-data-access';
import { CurrentHabitante } from '../auth/current-habitante.decorator';
import { HabitanteAuthService, ParDeTokensHabitante } from '../auth/habitante-auth.service';
import { HabitanteAutenticado } from '../auth/habitante-autenticado';
import { HabitanteJwtAuthGuard } from '../auth/habitante-jwt-auth.guard';
import { MiPerfilDto } from '../auth/mi-perfil.dto';
import { ActualizarContactoPropioDto } from '../dto/actualizar-contacto-propio.dto';
import { LoginHabitanteDto } from '../dto/login-habitante.dto';
import { RefrescarTokenHabitanteDto } from '../dto/refrescar-token-habitante.dto';
import { RegistroHabitanteDto } from '../dto/registro-habitante.dto';
import { HabitanteService, NucleoFamiliarDto } from '../services/habitante.service';
import { HogarService } from '../services/hogar.service';

/**
 * Portal de autogestión del propio habitante (Fase 14) — actor distinto del
 * personal del censo (`Usuario`/staff). Deliberadamente SIN
 * `@UseGuards(RolesGuard, ComunidadScopeGuard)` a nivel de clase (esos guards
 * asumen `UsuarioAutenticado`, que este controller nunca produce): cada ruta
 * se marca `@Public()` para saltarse el `JwtAuthGuard` global (estrategia
 * 'jwt', de staff) y protege con `HabitanteJwtAuthGuard` (estrategia
 * 'jwt-habitante') en su lugar.
 *
 * Mismo `@Controller('poblacion/habitantes')` que `HabitanteController`: las
 * rutas literales de aquí (auth/registro, mi-perfil, etc.) deben registrarse
 * ANTES que la ruta `:id` de `HabitanteController` (ver orden de
 * `controllers` en `ApiPoblacionFeatureModule`) — mismo bug de rutas ya
 * documentado en Fase 10.
 */
@Controller('poblacion/habitantes')
export class HabitanteAutogestionController {
  constructor(
    private readonly habitanteAuthService: HabitanteAuthService,
    private readonly habitanteService: HabitanteService,
    private readonly hogarService: HogarService,
  ) {}

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('auth/registro')
  registro(@Body() dto: RegistroHabitanteDto): Promise<{ habitanteId: number }> {
    return this.habitanteAuthService.registrar(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('auth/login')
  login(@Body() dto: LoginHabitanteDto): Promise<ParDeTokensHabitante> {
    return this.habitanteAuthService.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('auth/refrescar')
  refrescar(@Body() dto: RefrescarTokenHabitanteDto): Promise<ParDeTokensHabitante> {
    return this.habitanteAuthService.refrescar(dto.refreshToken);
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Get('mi-perfil')
  async miPerfil(@CurrentHabitante() actor: HabitanteAutenticado): Promise<MiPerfilDto> {
    const habitante = await this.habitanteService.obtener(actor.habitanteId);
    const hogar = await this.hogarService.obtener(actor.hogarId);
    return this.armarMiPerfil(habitante, hogar);
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Patch('mi-contacto')
  async actualizarMiContacto(
    @Body() dto: ActualizarContactoPropioDto,
    @CurrentHabitante() actor: HabitanteAutenticado,
  ): Promise<MiPerfilDto> {
    let habitante = await this.habitanteService.obtener(actor.habitanteId);
    if (dto.telefono !== undefined || dto.correoElectronico !== undefined) {
      habitante = await this.habitanteService.actualizarContactoPropio(actor.habitanteId, dto);
    }
    let hogar = await this.hogarService.obtener(actor.hogarId);
    if (dto.direccionReferencia !== undefined) {
      hogar = await this.hogarService.actualizarDireccionPropia(actor.hogarId, dto.direccionReferencia);
    }
    return this.armarMiPerfil(habitante, hogar);
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Get('mi-hogar/nucleo-familiar')
  nucleoFamiliarPropio(@CurrentHabitante() actor: HabitanteAutenticado): Promise<NucleoFamiliarDto> {
    return this.habitanteService.obtenerNucleoFamiliarPropio(actor.habitanteId);
  }

  private armarMiPerfil(habitante: Habitante, hogar: Hogar): MiPerfilDto {
    return {
      habitanteId: habitante.id,
      nombres: habitante.nombres,
      apellidos: habitante.apellidos,
      sexo: habitante.sexo,
      fechaNacimiento: habitante.fechaNacimiento,
      numeroDocumento: habitante.numeroDocumento,
      tipoDocumentoId: habitante.tipoDocumentoId,
      hogarId: habitante.hogarId,
      comunidadId: habitante.comunidadId,
      telefono: habitante.telefono,
      correoElectronico: habitante.correoElectronico,
      direccionReferencia: hogar.direccionReferencia,
    };
  }
}
