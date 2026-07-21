import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Public, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UbicacionGeografica } from '@censo/api-georreferenciacion-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ActualizarUbicacionGeograficaDto } from '../dto/actualizar-ubicacion-geografica.dto';
import { CrearUbicacionGeograficaDto } from '../dto/crear-ubicacion-geografica.dto';
import { UbicacionGeograficaService } from '../services/ubicacion-geografica.service';

/** Árbol de jerarquía geográfica (RF-03-01), administrable solo por ADMINISTRADOR (RT-02). */
@UseGuards(RolesGuard)
@Controller('georreferenciacion/ubicaciones-geograficas')
export class UbicacionGeograficaController {
  constructor(private readonly servicio: UbicacionGeograficaService) {}

  /**
   * Públicos (Fase 14): la jerarquía geográfica (país/departamento/municipio/
   * resguardo/vereda) son nombres de lugares, no datos personales. El portal
   * de autogestión del habitante necesita listar resguardos para el selector
   * de "mi salud/afiliación étnica" (`HabitanteEtnia.resguardoUbicacionGeograficaId`,
   * prerrequisito de la constancia de afiliación) sin poder depender de
   * `domain:georreferenciacion` desde `domain:poblacion`/`etnia-vulnerabilidad`
   * para un guard propio — mismo criterio que `CatalogoController`.
   */
  @Public()
  @Get()
  listar(@Query('padreId') padreId?: string): Promise<UbicacionGeografica[]> {
    return this.servicio.listar(padreId !== undefined ? Number(padreId) : undefined);
  }

  @Public()
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<UbicacionGeografica> {
    return this.servicio.obtener(id);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post()
  crear(@Body() dto: CrearUbicacionGeograficaDto): Promise<UbicacionGeografica> {
    return this.servicio.crear(dto);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUbicacionGeograficaDto,
  ): Promise<UbicacionGeografica> {
    return this.servicio.actualizar(id, dto);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.servicio.eliminar(id);
  }
}
