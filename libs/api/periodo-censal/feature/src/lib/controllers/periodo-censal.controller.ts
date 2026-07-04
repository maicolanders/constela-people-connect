import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '@censo/api-auth-feature';
import { PeriodoCensal } from '@censo/api-periodo-censal-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { CrearPeriodoCensalDto } from '../dto/crear-periodo-censal.dto';
import { PeriodoCensalService } from '../services/periodo-censal.service';

@UseGuards(RolesGuard)
@Controller('periodos-censales')
export class PeriodoCensalController {
  constructor(private readonly periodoCensalService: PeriodoCensalService) {}

  @Get()
  listar(): Promise<PeriodoCensal[]> {
    return this.periodoCensalService.listar();
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
}
