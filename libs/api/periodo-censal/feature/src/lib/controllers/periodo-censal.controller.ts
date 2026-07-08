import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { PeriodoCensal } from '@censo/api-periodo-censal-data-access';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { CrearPeriodoCensalDto } from '../dto/crear-periodo-censal.dto';
import { ComparacionHistoricaQueryDto } from '../dto/comparacion-historica-query.dto';
import { ComparacionComunidadDto, ComparacionHistoricaService } from '../services/comparacion-historica.service';
import { PeriodoCensalService } from '../services/periodo-censal.service';

@UseGuards(RolesGuard)
@Controller('periodos-censales')
export class PeriodoCensalController {
  constructor(
    private readonly periodoCensalService: PeriodoCensalService,
    private readonly comparacionHistoricaService: ComparacionHistoricaService,
  ) {}

  @Get()
  listar(): Promise<PeriodoCensal[]> {
    return this.periodoCensalService.listar();
  }

  /**
   * Ruta estática, debe registrarse ANTES de `:id` (más abajo): Express/Nest
   * hace match en orden de declaración, así que si `:id` fuera primero
   * "comparacion-historica" se interpretaría como un `id` numérico inválido.
   */
  @Get('comparacion-historica')
  comparacionHistorica(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: ComparacionHistoricaQueryDto,
  ): Promise<ComparacionComunidadDto[]> {
    return this.comparacionHistoricaService.comparar(usuario, dto);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<PeriodoCensal> {
    return this.periodoCensalService.obtener(id);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post()
  crear(@Body() dto: CrearPeriodoCensalDto): Promise<PeriodoCensal> {
    return this.periodoCensalService.crear(dto);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post(':id/abrir')
  abrir(@Param('id', ParseIntPipe) id: number): Promise<PeriodoCensal> {
    return this.periodoCensalService.abrir(id);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post(':id/cerrar')
  cerrar(@Param('id', ParseIntPipe) id: number): Promise<PeriodoCensal> {
    return this.periodoCensalService.cerrar(id);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post(':id/iniciar-nuevo')
  iniciarNuevoPeriodo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearPeriodoCensalDto,
  ): Promise<PeriodoCensal> {
    return this.periodoCensalService.iniciarNuevoPeriodo(id, dto);
  }
}
