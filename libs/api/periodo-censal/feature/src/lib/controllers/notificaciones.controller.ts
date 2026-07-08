import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, Roles, RolesGuard } from '@censo/api-auth-feature';
import { Notificacion } from '@censo/api-periodo-censal-data-access';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ProgramarNotificacionDto } from '../dto/programar-notificacion.dto';
import { NotificacionesService } from '../services/notificaciones.service';

@UseGuards(RolesGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post()
  programar(@Body() dto: ProgramarNotificacionDto): Promise<Notificacion> {
    return this.notificacionesService.programar(dto);
  }

  @Get()
  listarPendientes(@CurrentUser() usuario: UsuarioAutenticado): Promise<Notificacion[]> {
    return this.notificacionesService.listarPendientes(usuario);
  }

  @Patch(':id/leida')
  marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<Notificacion> {
    return this.notificacionesService.marcarLeida(id, usuario);
  }

  @Roles(RolCodigo.ADMINISTRADOR)
  @Post('generar-recordatorios')
  async generarRecordatorios(@Query('diasAnticipacion') diasAnticipacion?: string): Promise<{ activadas: number }> {
    const activadas = await this.notificacionesService.generarRecordatorios(
      diasAnticipacion ? parseInt(diasAnticipacion, 10) : undefined,
    );
    return { activadas };
  }
}
