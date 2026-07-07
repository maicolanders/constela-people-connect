import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { HabitanteOcupacion } from '@censo/api-economia-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarHabitanteOcupacionDto } from '../dto/actualizar-habitante-ocupacion.dto';
import { CrearHabitanteOcupacionDto } from '../dto/crear-habitante-ocupacion.dto';
import { IndicadoresEconomicosQueryDto } from '../dto/indicadores-economicos-query.dto';
import { EconomiaService } from '../services/economia.service';
import { IndicadoresEconomicosDto, IndicadoresEconomicosService } from '../services/indicadores-economicos.service';

const ROLES_INDIVIDUAL = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR];
const ROLES_REPORTE = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ANALISTA, RolCodigo.ADMINISTRADOR];

@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('economia')
export class EconomiaController {
  constructor(
    private readonly economiaService: EconomiaService,
    private readonly indicadoresEconomicosService: IndicadoresEconomicosService,
  ) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post('habitantes/:habitanteId')
  crear(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @Body() dto: CrearHabitanteOcupacionDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HabitanteOcupacion> {
    return this.economiaService.crearParaHabitante(habitanteId, dto, usuario);
  }

  @Roles(...ROLES_INDIVIDUAL)
  @Get('habitantes/:habitanteId')
  obtenerPorHabitante(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HabitanteOcupacion> {
    return this.economiaService.obtenerPorHabitante(habitanteId, usuario);
  }

  @Roles(...ROLES_REPORTE)
  @Get('indicadores')
  async indicadores(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: IndicadoresEconomicosQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IndicadoresEconomicosDto | string> {
    const resultado = await this.indicadoresEconomicosService.obtener(usuario, dto);
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="indicadores-economicos.csv"');
      return generarCsv([resultado as unknown as Record<string, unknown>]);
    }
    return resultado;
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarHabitanteOcupacionDto): Promise<HabitanteOcupacion> {
    return this.economiaService.actualizar(id, dto);
  }
}
