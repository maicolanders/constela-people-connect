import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notificacion } from '@censo/api-periodo-censal-data-access';
import { comunidadesPermitidas } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { ProgramarNotificacionDto } from '../dto/programar-notificacion.dto';

const DIAS_ANTICIPACION_POR_DEFECTO = 7;

/**
 * RF-10-03: recordatorios in-app de fechas programadas (actualización
 * censal/reencuesta). No hay envío de correo real (sin infraestructura SMTP
 * en el proyecto) ni scheduler/cron (`@nestjs/schedule` no está entre las
 * dependencias) — `generarRecordatorios` es invocado a demanda por un
 * administrador (endpoint dedicado), no en segundo plano automáticamente;
 * desviación deliberada y documentada, mismo espíritu que el "mapa con
 * flechas" de Fase 7.
 */
@Injectable()
export class NotificacionesService {
  constructor(@InjectRepository(Notificacion) private readonly notificacionRepository: Repository<Notificacion>) {}

  programar(dto: ProgramarNotificacionDto): Promise<Notificacion> {
    return this.notificacionRepository.save(
      this.notificacionRepository.create({
        comunidadId: dto.comunidadId ?? null,
        rolDestino: dto.rolDestino ?? null,
        usuarioDestinoId: dto.usuarioDestinoId ?? null,
        tipo: dto.tipo,
        mensaje: dto.mensaje,
        fechaProgramada: dto.fechaProgramada,
      }),
    );
  }

  /** Recordatorios ya activados (`notificadoEn` no nulo) dirigidos al usuario, su rol, o sus comunidades — pendientes de leer. */
  async listarPendientes(usuario: UsuarioAutenticado): Promise<Notificacion[]> {
    const permitido = comunidadesPermitidas(usuario.asignaciones);

    const candidatas = await this.notificacionRepository.find({
      where: { notificadoEn: LessThanOrEqual(new Date()) },
      order: { fechaProgramada: 'DESC' },
    });

    return candidatas.filter((notificacion) => {
      if (notificacion.usuarioDestinoId !== null) {
        return notificacion.usuarioDestinoId === usuario.id;
      }
      if (notificacion.rolDestino !== null && !usuario.roles.includes(notificacion.rolDestino as RolCodigo)) {
        return false;
      }
      if (notificacion.comunidadId !== null) {
        return permitido === 'global' || permitido.includes(notificacion.comunidadId);
      }
      return true;
    });
  }

  async marcarLeida(id: number, usuario: UsuarioAutenticado): Promise<Notificacion> {
    const notificacion = await this.notificacionRepository.findOne({ where: { id } });
    if (!notificacion) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }
    if (notificacion.usuarioDestinoId !== null && notificacion.usuarioDestinoId !== usuario.id) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }
    notificacion.leidaEn = new Date();
    return this.notificacionRepository.save(notificacion);
  }

  /** Activa (marca `notificadoEn`) los recordatorios cuya fecha programada ya está a `diasAnticipacion` días o menos. */
  async generarRecordatorios(diasAnticipacion: number = DIAS_ANTICIPACION_POR_DEFECTO): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() + diasAnticipacion);
    const limiteIso = limite.toISOString().slice(0, 10);

    const pendientes = await this.notificacionRepository.find({
      where: { notificadoEn: IsNull(), fechaProgramada: LessThanOrEqual(limiteIso) },
    });
    if (pendientes.length === 0) {
      return 0;
    }

    const ahora = new Date();
    for (const notificacion of pendientes) {
      notificacion.notificadoEn = ahora;
    }
    await this.notificacionRepository.save(pendientes);
    return pendientes.length;
  }
}
