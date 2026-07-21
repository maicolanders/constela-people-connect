import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ComunidadScopeGuard, CurrentUser, Public, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { CurrentHabitante, HabitanteAutenticado, HabitanteJwtAuthGuard } from '@censo/api-poblacion-feature';
import { HabitanteEducacion, HabitanteLengua } from '@censo/api-educacion-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarHabitanteEducacionDto } from '../dto/actualizar-habitante-educacion.dto';
import { CrearHabitanteEducacionDto } from '../dto/crear-habitante-educacion.dto';
import { IndicadoresEducativosQueryDto } from '../dto/indicadores-educativos-query.dto';
import { mapearMiEducacion, MiEducacionDto } from '../dto/mi-educacion.dto';
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

  /**
   * Autogestión del propio habitante (Fase 14): rutas literales `mi-registro`
   * declaradas ANTES que `:id` (mismo motivo que las rutas estáticas de
   * Fase 10) — de lo contrario `PATCH .../mi-registro` matchearía `:id` con
   * `ParseIntPipe` fallando. `actor.habitanteId` viene del JWT del propio
   * habitante, nunca de un parámetro de cliente.
   */
  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Post('mi-registro')
  async crearMiRegistro(
    @Body() dto: CrearHabitanteEducacionDto,
    @CurrentHabitante() actor: HabitanteAutenticado,
  ): Promise<MiEducacionDto> {
    return mapearMiEducacion(await this.educacionService.crearParaHabitante(actor.habitanteId, dto));
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Get('mi-registro')
  async obtenerMiRegistro(@CurrentHabitante() actor: HabitanteAutenticado): Promise<MiEducacionDto> {
    return mapearMiEducacion(await this.educacionService.obtenerPorHabitante(actor.habitanteId));
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Patch('mi-registro')
  async actualizarMiRegistro(
    @Body() dto: ActualizarHabitanteEducacionDto,
    @CurrentHabitante() actor: HabitanteAutenticado,
  ): Promise<MiEducacionDto> {
    const existente = await this.educacionService.obtenerPorHabitante(actor.habitanteId);
    return mapearMiEducacion(await this.educacionService.actualizar(existente.id, dto));
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Get('mi-registro/lenguas')
  obtenerMisLenguas(@CurrentHabitante() actor: HabitanteAutenticado): Promise<HabitanteLengua[]> {
    return this.educacionService.obtenerLenguas(actor.habitanteId);
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Put('mi-registro/lenguas')
  reemplazarMisLenguas(
    @Body() dto: ReemplazarLenguasHabitanteDto,
    @CurrentHabitante() actor: HabitanteAutenticado,
  ): Promise<HabitanteLengua[]> {
    return this.educacionService.reemplazarLenguas(actor.habitanteId, dto.lenguas);
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
