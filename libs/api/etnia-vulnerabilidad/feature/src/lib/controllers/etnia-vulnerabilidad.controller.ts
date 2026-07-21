import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ComunidadScopeGuard,
  CurrentUser,
  Public,
  Roles,
  RolesGuard,
} from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { CurrentHabitante, HabitanteAutenticado, HabitanteJwtAuthGuard } from '@censo/api-poblacion-feature';
import {
  HabitanteCondicionVulnerabilidad,
  HabitanteEtnia,
} from '@censo/api-etnia-vulnerabilidad-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarHabitanteEtniaDto } from '../dto/actualizar-habitante-etnia.dto';
import { CaracterizacionEtnicaQueryDto } from '../dto/caracterizacion-etnica-query.dto';
import { CrearHabitanteEtniaDto } from '../dto/crear-habitante-etnia.dto';
import { mapearMiCondicion, mapearMiEtnia, MiCondicionVulnerabilidadDto, MiEtniaDto } from '../dto/mi-etnia.dto';
import { ReemplazarCondicionesVulnerabilidadDto } from '../dto/reemplazar-condiciones-vulnerabilidad.dto';
import {
  CaracterizacionEtnicaDto,
  CaracterizacionEtnicaService,
} from '../services/caracterizacion-etnica.service';
import { ConstanciaAfiliacionService } from '../services/constancia-afiliacion.service';
import { EtniaVulnerabilidadService } from '../services/etnia-vulnerabilidad.service';

const ROLES_INDIVIDUAL = [
  RolCodigo.CENSISTA,
  RolCodigo.LIDER_COMUNITARIO,
  RolCodigo.ADMINISTRADOR,
];
const ROLES_REPORTE = [
  RolCodigo.CENSISTA,
  RolCodigo.LIDER_COMUNITARIO,
  RolCodigo.ANALISTA,
  RolCodigo.ADMINISTRADOR,
];

@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('etnia-vulnerabilidad')
export class EtniaVulnerabilidadController {
  constructor(
    private readonly etniaVulnerabilidadService: EtniaVulnerabilidadService,
    private readonly caracterizacionEtnicaService: CaracterizacionEtnicaService,
    private readonly constanciaAfiliacionService: ConstanciaAfiliacionService,
  ) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post('habitantes/:habitanteId')
  crear(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @Body() dto: CrearHabitanteEtniaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HabitanteEtnia> {
    return this.etniaVulnerabilidadService.crearParaHabitante(
      habitanteId,
      dto,
      usuario,
    );
  }

  @Roles(...ROLES_INDIVIDUAL)
  @Get('habitantes/:habitanteId')
  obtenerPorHabitante(
    @Param('habitanteId', ParseIntPipe) habitanteId: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HabitanteEtnia> {
    return this.etniaVulnerabilidadService.obtenerPorHabitante(
      habitanteId,
      usuario,
    );
  }

  @Roles(...ROLES_REPORTE)
  @Get('reportes/caracterizacion')
  async caracterizacion(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: CaracterizacionEtnicaQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CaracterizacionEtnicaDto | string> {
    const resultado = await this.caracterizacionEtnicaService.obtener(
      usuario,
      dto,
    );
    if (dto.formato === 'csv') {
      const filas = [
        ...resultado.porEtnia.map((fila) => ({ tipo: 'etnia', ...fila })),
        ...resultado.porCondicionVulnerabilidad.map((fila) => ({
          tipo: 'condicion_vulnerabilidad',
          ...fila,
        })),
      ];
      res.header('Content-Type', 'text/csv');
      res.header(
        'Content-Disposition',
        'attachment; filename="caracterizacion-etnica.csv"',
      );
      return generarCsv(filas as unknown as Record<string, unknown>[]);
    }
    return resultado;
  }

  /**
   * Autogestión del propio habitante (Fase 14): `mi-registro` declarado ANTES
   * que `:id` (mismo motivo de orden de rutas que en educación/Fase 10).
   * `PUT mi-registro/condiciones-vulnerabilidad` es "editar salud" en esta
   * fase — reusa `reemplazarCondiciones`, no crea entidad de salud nueva.
   */
  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Post('mi-registro')
  async crearMiRegistro(
    @Body() dto: CrearHabitanteEtniaDto,
    @CurrentHabitante() actor: HabitanteAutenticado,
  ): Promise<MiEtniaDto> {
    return mapearMiEtnia(await this.etniaVulnerabilidadService.crearParaHabitante(actor.habitanteId, dto));
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Get('mi-registro')
  async obtenerMiRegistro(@CurrentHabitante() actor: HabitanteAutenticado): Promise<MiEtniaDto> {
    return mapearMiEtnia(await this.etniaVulnerabilidadService.obtenerPorHabitante(actor.habitanteId));
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Patch('mi-registro')
  async actualizarMiRegistro(
    @Body() dto: ActualizarHabitanteEtniaDto,
    @CurrentHabitante() actor: HabitanteAutenticado,
  ): Promise<MiEtniaDto> {
    const existente = await this.etniaVulnerabilidadService.obtenerPorHabitante(actor.habitanteId);
    return mapearMiEtnia(await this.etniaVulnerabilidadService.actualizar(existente.id, dto));
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Get('mi-registro/condiciones-vulnerabilidad')
  async obtenerMisCondiciones(@CurrentHabitante() actor: HabitanteAutenticado): Promise<MiCondicionVulnerabilidadDto[]> {
    const condiciones = await this.etniaVulnerabilidadService.obtenerCondiciones(actor.habitanteId);
    return condiciones.map(mapearMiCondicion);
  }

  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Put('mi-registro/condiciones-vulnerabilidad')
  async reemplazarMisCondiciones(
    @Body() dto: ReemplazarCondicionesVulnerabilidadDto,
    @CurrentHabitante() actor: HabitanteAutenticado,
  ): Promise<MiCondicionVulnerabilidadDto[]> {
    const condiciones = await this.etniaVulnerabilidadService.reemplazarCondiciones(actor.habitanteId, dto.condiciones);
    return condiciones.map(mapearMiCondicion);
  }

  /** Constancia de afiliación a resguardo (Fase 14, autogestión): descarga en PDF. */
  @Public()
  @UseGuards(HabitanteJwtAuthGuard)
  @Get('mi-constancia')
  async miConstancia(
    @CurrentHabitante() actor: HabitanteAutenticado,
    @Res() res: Response,
  ): Promise<void> {
    const documento = await this.constanciaAfiliacionService.generar(actor.habitanteId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="constancia-afiliacion.pdf"');
    documento.pipe(res);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarHabitanteEtniaDto,
  ): Promise<HabitanteEtnia> {
    return this.etniaVulnerabilidadService.actualizar(id, dto);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Put(':id/condiciones-vulnerabilidad')
  async reemplazarCondiciones(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReemplazarCondicionesVulnerabilidadDto,
  ): Promise<HabitanteCondicionVulnerabilidad[]> {
    const etnia = await this.etniaVulnerabilidadService.obtener(id);
    return this.etniaVulnerabilidadService.reemplazarCondiciones(
      etnia.habitanteId,
      dto.condiciones,
    );
  }
}
