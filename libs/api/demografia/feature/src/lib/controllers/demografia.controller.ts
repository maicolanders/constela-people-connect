import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { DemografiaQueryDto } from '../dto/demografia-query.dto';
import { BucketPiramide, PiramidePoblacionalService } from '../services/piramide-poblacional.service';
import { IndicadoresDemograficosDto, IndicadoresDemograficosService } from '../services/indicadores-demograficos.service';

const ROLES_LECTURA_DEMOGRAFIA = [
  RolCodigo.CENSISTA,
  RolCodigo.LIDER_COMUNITARIO,
  RolCodigo.ANALISTA,
  RolCodigo.ADMINISTRADOR,
];

@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('demografia')
export class DemografiaController {
  constructor(
    private readonly piramideService: PiramidePoblacionalService,
    private readonly indicadoresService: IndicadoresDemograficosService,
  ) {}

  @Roles(...ROLES_LECTURA_DEMOGRAFIA)
  @Get('piramide')
  async piramide(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: DemografiaQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BucketPiramide[] | string> {
    const buckets = await this.piramideService.obtener(usuario, dto);
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="piramide-poblacional.csv"');
      return generarCsv(buckets as unknown as Record<string, unknown>[]);
    }
    return buckets;
  }

  @Roles(...ROLES_LECTURA_DEMOGRAFIA)
  @Get('indicadores')
  async indicadores(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: DemografiaQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IndicadoresDemograficosDto | string> {
    const resultado = await this.indicadoresService.obtener(usuario, dto);
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="indicadores-demograficos.csv"');
      return generarCsv([resultado as unknown as Record<string, unknown>]);
    }
    return resultado;
  }
}
