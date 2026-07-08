import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { MovimientoMigratorio } from '@censo/api-migracion-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarMovimientoMigratorioDto } from '../dto/actualizar-movimiento-migratorio.dto';
import { CrearMovimientoMigratorioDto } from '../dto/crear-movimiento-migratorio.dto';
import { FlujosMigratoriosQueryDto } from '../dto/flujos-migratorios-query.dto';
import { FlujosMigratoriosDto, FlujosMigratoriosService } from '../services/flujos-migratorios.service';
import { MigracionService } from '../services/migracion.service';

const ROLES_INDIVIDUAL = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR];
const ROLES_REPORTE = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ANALISTA, RolCodigo.ADMINISTRADOR];

@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('migracion')
export class MigracionController {
  constructor(
    private readonly migracionService: MigracionService,
    private readonly flujosMigratoriosService: FlujosMigratoriosService,
  ) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post('habitantes/:habitanteId')
  crear(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @Body() dto: CrearMovimientoMigratorioDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<MovimientoMigratorio> {
    return this.migracionService.crearParaHabitante(habitanteId, dto, usuario);
  }

  @Roles(...ROLES_INDIVIDUAL)
  @Get('habitantes/:habitanteId')
  listarPorHabitante(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<MovimientoMigratorio[]> {
    return this.migracionService.listarPorHabitante(habitanteId, usuario);
  }

  @Roles(...ROLES_REPORTE)
  @Get('flujos')
  async flujos(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: FlujosMigratoriosQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FlujosMigratoriosDto | string> {
    const resultado = await this.flujosMigratoriosService.obtener(usuario, dto);
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="flujos-migratorios.csv"');
      return generarCsv(resultado.flujos as unknown as Record<string, unknown>[]);
    }
    return resultado;
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarMovimientoMigratorioDto,
  ): Promise<MovimientoMigratorio> {
    return this.migracionService.actualizar(id, dto);
  }

  /** Corrección administrativa real de un registro erróneo (no "deshace" un evento histórico real). */
  @Roles(RolCodigo.ADMINISTRADOR)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.migracionService.eliminar(id);
  }
}
