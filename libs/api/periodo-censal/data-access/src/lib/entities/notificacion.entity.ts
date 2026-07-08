import { Column, Entity } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';

/**
 * RF-10-03: recordatorio in-app de una fecha programada (actualización censal
 * o reencuesta muestral). `comunidadId`/`usuarioDestinoId` son columnas
 * planas (sin relación real): `domain:periodo-censal` no puede depender de
 * `domain:comunidad` (ver eslint.config.mjs), mismo criterio que
 * `Hogar.viviendaId` en Fase 3/4. Sin envío real de correo (no hay
 * infraestructura SMTP en el proyecto): `notificadoEn` marca cuándo el
 * recordatorio "se activó" para mostrarse in-app, disparado por
 * `NotificacionesService.generarRecordatorios` (invocado por un
 * administrador; no hay scheduler/cron en este backend).
 */
@Entity('notificaciones')
export class Notificacion extends AuditableBaseEntity {
  @Column({ name: 'comunidad_id', type: 'integer', nullable: true })
  comunidadId!: number | null;

  @Column({ name: 'rol_destino', type: 'varchar', length: 30, nullable: true })
  rolDestino!: string | null;

  @Column({ name: 'usuario_destino_id', type: 'integer', nullable: true })
  usuarioDestinoId!: number | null;

  @Column({ type: 'varchar', length: 50 })
  tipo!: string;

  @Column({ type: 'text' })
  mensaje!: string;

  @Column({ name: 'fecha_programada', type: 'date' })
  fechaProgramada!: string;

  @Column({ name: 'notificado_en', type: 'timestamptz', nullable: true })
  notificadoEn!: Date | null;

  @Column({ name: 'leida_en', type: 'timestamptz', nullable: true })
  leidaEn!: Date | null;
}
