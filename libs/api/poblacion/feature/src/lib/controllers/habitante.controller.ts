import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ActualizarHabitanteDto } from '../dto/actualizar-habitante.dto';
import { ConteoHabitantesQueryDto } from '../dto/conteo-habitantes-query.dto';
import { CrearHabitanteDto } from '../dto/crear-habitante.dto';
import { DarBajaHabitanteDto } from '../dto/dar-baja-habitante.dto';
import { ListarHabitantesQueryDto } from '../dto/listar-habitantes-query.dto';
import { VerificarDuplicadosDto } from '../dto/verificar-duplicados.dto';
import { CandidatoDuplicado, HabitanteService } from '../services/habitante.service';

/**
 * Rutas estáticas ('conteo', 'verificar-duplicados') declaradas antes de
 * ':id' a propósito: en Nest/Express el orden de registro decide qué ruta
 * matchea primero dentro del mismo método HTTP.
 */
@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('poblacion/habitantes')
export class HabitanteController {
  constructor(private readonly habitanteService: HabitanteService) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR)
  @Get()
  listar(@CurrentUser() usuario: UsuarioAutenticado, @Query() filtros: ListarHabitantesQueryDto): Promise<Habitante[]> {
    return this.habitanteService.listar(usuario, filtros);
  }

  /** RF-01-04: conteo de población activa, filtrable por comunidad/periodo. */
  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ANALISTA, RolCodigo.ADMINISTRADOR)
  @Get('conteo')
  contar(@CurrentUser() usuario: UsuarioAutenticado, @Query() filtros: ConteoHabitantesQueryDto): Promise<{ total: number }> {
    return this.habitanteService.contarActivos(usuario, filtros).then((total) => ({ total }));
  }

  /** RF-01-05: candidatos a duplicado (uso online/backoffice; el flujo offline usa la misma función en el frontend). */
  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post('verificar-duplicados')
  verificarDuplicados(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: VerificarDuplicadosDto,
  ): Promise<CandidatoDuplicado[]> {
    return this.habitanteService.verificarDuplicados(usuario, dto);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR)
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado): Promise<Habitante> {
    return this.habitanteService.obtener(id, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post()
  crear(@Body() dto: CrearHabitanteDto, @CurrentUser() usuario: UsuarioAutenticado): Promise<Habitante> {
    return this.habitanteService.crear(dto, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarHabitanteDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<Habitante> {
    return this.habitanteService.actualizar(id, dto, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post(':id/dar-baja')
  darBaja(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DarBajaHabitanteDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<Habitante> {
    return this.habitanteService.darBaja(id, dto, usuario);
  }

  /** Corrección administrativa real de un registro erróneo (no es "dar de baja"). */
  @Roles(RolCodigo.ADMINISTRADOR)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.habitanteService.eliminar(id);
  }
}
