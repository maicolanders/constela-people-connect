import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Vivienda, VivendaServicio } from '@censo/api-vivienda-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarViviendaDto } from '../dto/actualizar-vivienda.dto';
import { CoberturaServiciosQueryDto } from '../dto/cobertura-servicios-query.dto';
import { CrearViviendaDto } from '../dto/crear-vivienda.dto';
import { ReemplazarServiciosViviendaDto } from '../dto/reemplazar-servicios-vivienda.dto';
import { CoberturaServicioDto, CoberturaServiciosService } from '../services/cobertura-servicios.service';
import { HacinamientoNbiService, IndicadoresViviendaHogarDto } from '../services/hacinamiento-nbi.service';
import { ViviendaService } from '../services/vivienda.service';

const ROLES_INDIVIDUAL = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR];
const ROLES_REPORTE = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ANALISTA, RolCodigo.ADMINISTRADOR];

@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('vivienda')
export class ViviendaController {
  constructor(
    private readonly viviendaService: ViviendaService,
    private readonly hacinamientoNbiService: HacinamientoNbiService,
    private readonly coberturaServiciosService: CoberturaServiciosService,
  ) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post('hogares/:hogarId')
  crear(
    @Param('hogarId', ParseIntPipe) hogarId: number,
    @Body() dto: CrearViviendaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<Vivienda> {
    return this.viviendaService.crearParaHogar(hogarId, dto, usuario);
  }

  @Roles(...ROLES_INDIVIDUAL)
  @Get('hogares/:hogarId')
  obtenerPorHogar(
    @Param('hogarId', ParseIntPipe) hogarId: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<Vivienda> {
    return this.viviendaService.obtenerPorHogar(hogarId, usuario);
  }

  @Roles(...ROLES_INDIVIDUAL)
  @Get('hogares/:hogarId/indicadores')
  indicadores(
    @Param('hogarId', ParseIntPipe) hogarId: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<IndicadoresViviendaHogarDto> {
    return this.hacinamientoNbiService.calcularParaHogar(hogarId, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarViviendaDto): Promise<Vivienda> {
    return this.viviendaService.actualizar(id, dto);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Put(':id/servicios')
  reemplazarServicios(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReemplazarServiciosViviendaDto,
  ): Promise<VivendaServicio[]> {
    return this.viviendaService.reemplazarServicios(id, dto.servicios);
  }

  @Roles(...ROLES_REPORTE)
  @Get('cobertura')
  async cobertura(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: CoberturaServiciosQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CoberturaServicioDto[] | string> {
    const filas = await this.coberturaServiciosService.obtenerCobertura(usuario, dto.comunidadId, dto.periodoCensalId);
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="cobertura-servicios.csv"');
      return generarCsv(filas as unknown as Record<string, unknown>[]);
    }
    return filas;
  }
}
