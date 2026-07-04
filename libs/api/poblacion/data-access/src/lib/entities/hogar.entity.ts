import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { EstadoHogar } from '@censo/shared-data-access';
import { Habitante } from './habitante.entity';

/**
 * Entidad de identidad (patrón de versionado por periodo censal, Fase 0):
 * una sola fila por hogar, con `periodoCensalId` (alta) + `periodoBajaId`
 * nullable + `estado`. "Dar de baja" un hogar es una transición de estado,
 * no un soft-delete (que queda reservado a corrección administrativa).
 */
@Entity('hogares')
export class Hogar extends AuditableBaseEntity {
  @Column({ type: 'varchar', length: 36, unique: true })
  uuid!: string;

  @Column({ name: 'comunidad_id', type: 'integer' })
  comunidadId!: number;

  @Column({ name: 'periodo_censal_id', type: 'integer' })
  periodoCensalId!: number;

  @Column({ name: 'periodo_baja_id', type: 'integer', nullable: true })
  periodoBajaId!: number | null;

  @Column({ type: 'varchar', length: 20, default: EstadoHogar.ACTIVO })
  estado!: EstadoHogar;

  @Column({ name: 'motivo_baja', type: 'varchar', length: 200, nullable: true })
  motivoBaja!: string | null;

  @Column({ name: 'jefe_hogar_id', type: 'integer', nullable: true })
  jefeHogarId!: number | null;

  @ManyToOne(() => Habitante, { nullable: true })
  @JoinColumn({ name: 'jefe_hogar_id' })
  jefeHogar?: Habitante | null;

  @Column({ name: 'direccion_referencia', type: 'text', nullable: true })
  direccionReferencia!: string | null;

  @Column({ name: 'consentimiento_informado', type: 'boolean', default: false })
  consentimientoInformado!: boolean;

  @Column({ name: 'consentimiento_fecha', type: 'timestamptz', nullable: true })
  consentimientoFecha!: Date | null;
}
