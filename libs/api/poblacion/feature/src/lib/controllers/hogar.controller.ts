import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ComunidadScopeGuard, CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Hogar } from '@censo/api-poblacion-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ActualizarHogarDto } from '../dto/actualizar-hogar.dto';
import { ActualizarJefeHogarDto } from '../dto/actualizar-jefe-hogar.dto';
import { CrearHogarDto } from '../dto/crear-hogar.dto';
import { DarBajaHogarDto } from '../dto/dar-baja-hogar.dto';
import { ListarHogaresQueryDto } from '../dto/listar-hogares-query.dto';
import { HogarService } from '../services/hogar.service';

/**
 * JwtAuthGuard aplica globalmente (ver AppModule). ComunidadScopeGuard cubre
 * las rutas con comunidadId en query/body (listar/crear); las rutas por :id
 * (sin comunidadId en la URL) se protegen dentro del servicio, que valida
 * `usuario` contra la comunidad real del registro cargado.
 */
@UseGuards(RolesGuard, ComunidadScopeGuard)
@Controller('poblacion/hogares')
export class HogarController {
  constructor(private readonly hogarService: HogarService) {}

  @Roles(RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR)
  @Get()
  listar(@CurrentUser() usuario: UsuarioAutenticado, @Query() filtros: ListarHogaresQueryDto): Promise<Hogar[]> {
    return this.hogarService.listar(usuario, filtros);
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
}
