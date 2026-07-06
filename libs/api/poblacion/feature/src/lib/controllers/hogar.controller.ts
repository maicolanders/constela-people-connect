import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Hogar } from '@censo/api-poblacion-data-access';
import { RegistrarUbicacionHogarDto } from '@censo/api-georreferenciacion-feature';
import { HogarUbicacion } from '@censo/api-georreferenciacion-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { ActualizarHogarDto } from '../dto/actualizar-hogar.dto';
import { ActualizarJefeHogarDto } from '../dto/actualizar-jefe-hogar.dto';
import { CrearHogarDto } from '../dto/crear-hogar.dto';
import { DarBajaHogarDto } from '../dto/dar-baja-hogar.dto';
import { ListarHogaresQueryDto } from '../dto/listar-hogares-query.dto';
import { MapaHogaresQueryDto } from '../dto/mapa-hogares-query.dto';
import { HogarService } from '../services/hogar.service';
import { MapaHogaresService } from '../services/mapa-hogares.service';

/**
 * JwtAuthGuard aplica globalmente (ver AppModule). ComunidadScopeGuard cubre
 * las rutas con comunidadId en query/body (listar/crear); las rutas por :id
 * (sin comunidadId en la URL) se protegen dentro del servicio, que valida
 * `usuario` contra la comunidad real del registro cargado.
 */
@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('poblacion/hogares')
export class HogarController {
  constructor(
    private readonly hogarService: HogarService,
    private readonly mapaHogaresService: MapaHogaresService,
  ) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR)
  @Get()
  listar(@CurrentUser() usuario: UsuarioAutenticado, @Query() filtros: ListarHogaresQueryDto): Promise<Hogar[]> {
    return this.hogarService.listar(usuario, filtros);
  }

  /** RF-03-03: registrada antes de `:id` para que "mapa" no se interprete como un id. */
  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ANALISTA, RolCodigo.ADMINISTRADOR)
  @Get('mapa')
  async mapa(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() dto: MapaHogaresQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const puntos = await this.mapaHogaresService.obtener(usuario, dto.comunidadId, dto.periodoCensalId);
    if (dto.formato === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="mapa-hogares.csv"');
      return generarCsv(puntos as unknown as Record<string, unknown>[]);
    }
    return puntos;
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR)
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado): Promise<Hogar> {
    return this.hogarService.obtener(id, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post()
  crear(@Body() dto: CrearHogarDto, @CurrentUser() usuario: UsuarioAutenticado): Promise<Hogar> {
    return this.hogarService.crear(dto, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarHogarDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<Hogar> {
    return this.hogarService.actualizar(id, dto, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Post(':id/dar-baja')
  darBaja(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DarBajaHogarDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<Hogar> {
    return this.hogarService.darBaja(id, dto, usuario);
  }

  /** RF-01-03: definir explícitamente quién es el jefe de hogar (reasignación manual). */
  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Patch(':id/jefe')
  async actualizarJefe(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarJefeHogarDto): Promise<Hogar> {
    await this.hogarService.actualizarJefeHogar(id, dto.jefeHogarId);
    return this.hogarService.obtener(id);
  }

  /** Corrección administrativa real de un registro erróneo (no es "dar de baja"). */
  @Roles(RolCodigo.ADMINISTRADOR)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.hogarService.eliminar(id);
  }

  /** RF-03-02/03-04: captura o corrige la ubicación GPS del hogar. */
  @Roles(RolCodigo.CENSISTA, RolCodigo.ADMINISTRADOR)
  @Put(':id/ubicacion')
  registrarUbicacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarUbicacionHogarDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HogarUbicacion> {
    return this.hogarService.registrarUbicacion(id, dto, usuario);
  }

  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR)
  @Get(':id/ubicacion')
  obtenerUbicacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<HogarUbicacion | null> {
    return this.hogarService.obtenerUbicacion(id, usuario);
  }
}
