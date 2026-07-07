import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { HabitanteEducacion, HabitanteLengua } from '@censo/api-educacion-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarHabitanteEducacionDto } from '../dto/actualizar-habitante-educacion.dto';
import { CrearHabitanteEducacionDto } from '../dto/crear-habitante-educacion.dto';
import { IndicadoresEducativosQueryDto } from '../dto/indicadores-educativos-query.dto';
import { ReemplazarLenguasHabitanteDto } from '../dto/reemplazar-lenguas-habitante.dto';
import { EducacionService } from '../services/educacion.service';
import { IndicadoresEducativosDto, IndicadoresEducativosService } from '../services/indicadores-educativos.service';

const ROLES_INDIVIDUAL = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR];
const ROLES_REPORTE = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ANALISTA, RolCodigo.ADMINISTRADOR];

@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('educacion')
export class EducacionController {
  constructor(
    private readonly educacionService: EducacionService,
    private readonly indicadoresEducativosService: IndicadoresEducativosService,
  ) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post('habitantes/:habitanteId')
  crear(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @Body() dto: CrearHabitanteEducacionDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HabitanteEducacion> {
    return this.educacionService.crearParaHabitante(habitanteId, dto, usuario);
  }

  @Roles(...ROLES_INDIVIDUAL)
  @Get('habitantes/:habitanteId')
  obtenerPorHabitante(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HabitanteEducacion> {
    return this.educacionService.obtenerPorHabitante(habitanteId, usuario);
  }

  @Roles(...ROLES_REPORTE)
  @Get('indicadores')
  async indicadores(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: IndicadoresEducativosQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IndicadoresEducativosDto | string> {
    const resultado = await this.indicadoresEducativosService.obtener(usuario, dto);
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="indicadores-educativos.csv"');
      return generarCsv([resultado as unknown as Record<string, unknown>]);
    }
    return resultado;
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarHabitanteEducacionDto): Promise<HabitanteEducacion> {
    return this.educacionService.actualizar(id, dto);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Put(':id/lenguas')
  async reemplazarLenguas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReemplazarLenguasHabitanteDto,
  ): Promise<HabitanteLengua[]> {
    const educacion = await this.educacionService.obtener(id);
    return this.educacionService.reemplazarLenguas(educacion.habitanteId, dto.lenguas);
  }
}
