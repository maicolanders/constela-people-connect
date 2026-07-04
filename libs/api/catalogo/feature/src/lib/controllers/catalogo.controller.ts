import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '@censo/api-auth-feature';
import { CatalogoItem, CatalogoTipo } from '@censo/api-catalogo-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ActualizarCatalogoItemDto } from '../dto/actualizar-catalogo-item.dto';
import { CrearCatalogoItemDto } from '../dto/crear-catalogo-item.dto';
import { CatalogoService } from '../services/catalogo.service';

@UseGuards(RolesGuard)
@Controller('catalogos')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  listarTipos(): Promise<CatalogoTipo[]> {
    return this.catalogoService.listarTipos();
  }

  @Get(':tipoCodigo/items')
  listarItems(@Param('tipoCodigo') tipoCodigo: string): Promise<CatalogoItem[]> {
    return this.catalogoService.listarItemsPorTipo(tipoCodigo);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post(':tipoCodigo/items')
  crearItem(@Param('tipoCodigo') tipoCodigo: string, @Body() dto: CrearCatalogoItemDto): Promise<CatalogoItem> {
    return this.catalogoService.crearItem(tipoCodigo, dto);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Patch('items/:id')
  actualizarItem(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarCatalogoItemDto): Promise<CatalogoItem> {
    return this.catalogoService.actualizarItem(id, dto);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Delete('items/:id')
  eliminarItem(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.catalogoService.eliminarItem(id);
  }
}
