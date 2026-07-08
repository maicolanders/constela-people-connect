import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { Presupuesto } from '@censo/api-recursos-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarPresupuestoDto } from '../dto/actualizar-presupuesto.dto';
import { CrearPresupuestoDto } from '../dto/crear-presupuesto.dto';
import { IndicadoresRecursosQueryDto } from '../dto/indicadores-recursos-query.dto';
import {
  IndicadoresRecursosDto,
  IndicadoresRecursosService,
} from '../services/indicadores-recursos.service';
import { PresupuestoService } from '../services/presupuesto.service';

/**
 * RF-09-02: "Solo roles autorizados (analista/administrador) pueden
 * registrar o modificar esta información" — a diferencia de todos los
 * dominios anteriores (censista/administrador para captura, censista incluido
 * en los reportes), aquí CENSISTA y LIDER_COMUNITARIO quedan explícitamente
 * fuera de todo el controlador: esto es planeación presupuestal, no captura
 * de campo ni consulta operativa de la propia comunidad.
 */
const ROLES_RECURSOS = [RolCodigo.ANALISTA, RolCodigo.ADMINISTRADOR];

@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('recursos')
export class RecursosController {
  constructor(
    private readonly presupuestoService: PresupuestoService,
    private readonly indicadoresRecursosService: IndicadoresRecursosService,
  ) {}

  @Roles(...ROLES_RECURSOS)
  @Post('presupuestos')
  crearPresupuesto(@Body() dto: CrearPresupuestoDto): Promise<Presupuesto> {
    return this.presupuestoService.crear(dto);
  }

  @Roles(...ROLES_RECURSOS)
  @Get('presupuestos')
  listarPresupuestos(
    @Query('periodoCensalId', ParseIntPipe) periodoCensalId: number,
  ): Promise<Presupuesto[]> {
    return this.presupuestoService.listarPorPeriodo(periodoCensalId);
  }

  @Roles(...ROLES_RECURSOS)
  @Patch('presupuestos/:id')
  actualizarPresupuesto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPresupuestoDto,
  ): Promise<Presupuesto> {
    return this.presupuestoService.actualizar(id, dto);
  }

  @Roles(...ROLES_RECURSOS)
  @Get('indicadores')
  async indicadores(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: IndicadoresRecursosQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IndicadoresRecursosDto | string> {
    const resultado = await this.indicadoresRecursosService.obtener(
      usuario,
      dto,
    );
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header(
        'Content-Disposition',
        'attachment; filename="indicadores-recursos.csv"',
      );
      return generarCsv(
        resultado.comunidades as unknown as Record<string, unknown>[],
      );
    }
    return resultado;
  }
}
