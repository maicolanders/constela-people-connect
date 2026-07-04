import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '@censo/api-auth-feature';
import { Comunidad } from '@censo/api-comunidad-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ActualizarComunidadDto } from '../dto/actualizar-comunidad.dto';
import { CrearComunidadDto } from '../dto/crear-comunidad.dto';
import { ComunidadService } from '../services/comunidad.service';

/**
 * JwtAuthGuard aplica globalmente (ver AppModule): todas las rutas aquí ya
 * exigen autenticación. Este controller solo añade el chequeo de rol para
 * las mutaciones (RT-01: gestión de comunidades es tarea de administrador).
 */
@Controller('comunidades')
export class ComunidadController {
  constructor(private readonly comunidadService: ComunidadService) {}

  @Get()
  listar(): Promise<Comunidad[]> {
    return this.comunidadService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number): Promise<Comunidad> {
    return this.comunidadService.obtener(id);
  }

  @UseGuards(RolesGuard)
  @Roles(RolCodigo.ADMINISTRADOR)
  @Post()
  crear(@Body() dto: CrearComunidadDto): Promise<Comunidad> {
    return this.comunidadService.crear(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(RolCodigo.ADMINISTRADOR)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarComunidadDto): Promise<Comunidad> {
    return this.comunidadService.actualizar(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(RolCodigo.ADMINISTRADOR)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.comunidadService.eliminar(id);
  }
}
