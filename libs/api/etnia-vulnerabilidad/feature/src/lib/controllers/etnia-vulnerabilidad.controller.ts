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
  Roles,
  RolesGuard,
} from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import {
  HabitanteCondicionVulnerabilidad,
  HabitanteEtnia,
} from '@censo/api-etnia-vulnerabilidad-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarHabitanteEtniaDto } from '../dto/actualizar-habitante-etnia.dto';
import { CaracterizacionEtnicaQueryDto } from '../dto/caracterizacion-etnica-query.dto';
import { CrearHabitanteEtniaDto } from '../dto/crear-habitante-etnia.dto';
import { ReemplazarCondicionesVulnerabilidadDto } from '../dto/reemplazar-condiciones-vulnerabilidad.dto';
import {
  CaracterizacionEtnicaDto,
  CaracterizacionEtnicaService,
} from '../services/caracterizacion-etnica.service';
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
