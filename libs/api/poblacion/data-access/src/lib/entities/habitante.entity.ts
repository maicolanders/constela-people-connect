import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity, CampoSensible } from '@censo/api-shared-data-access';
import { EstadoHabitante, RolCodigo, SexoHabitante } from '@censo/shared-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { Hogar } from './hogar.entity';

/**
 * Entidad de identidad (patrón de versionado por periodo censal, Fase 0):
 * una sola fila por habitante. "Dar de baja" (fallecido/trasladado/no
 * localizado) es una transición de `estado` + `periodoBajaId`, NO un
 * soft-delete: RF-01-02 exige que siga apareciendo en reportes históricos,
 * lo que `deletedAt` (excluido por defecto de las consultas) impediría.
 * `deletedAt`/`softRemove` queda reservado a corrección administrativa real
 * de un registro erróneo.
 */
@Entity('habitantes')
@Index(['comunidadId', 'tipoDocumentoId', 'numeroDocumento'], {
  unique: true,
  where: '"numero_documento" IS NOT NULL',
})
export class Habitante extends AuditableBaseEntity {
  @Column({ type: 'varchar', length: 36, unique: true })
  uuid!: string;

  @Column({ name: 'hogar_id', type: 'integer' })
  hogarId!: number;

  @ManyToOne(() => Hogar)
  @JoinColumn({ name: 'hogar_id' })
  hogar?: Hogar;

  /** Denormalizado desde hogar.comunidadId: evita joins en el scoring de duplicados y el scope por comunidad. */
  @Column({ name: 'comunidad_id', type: 'integer' })
  comunidadId!: number;

  @Column({ name: 'periodo_censal_id', type: 'integer' })
  periodoCensalId!: number;

  @Column({ name: 'periodo_baja_id', type: 'integer', nullable: true })
  periodoBajaId!: number | null;

  @Column({ type: 'varchar', length: 20, default: EstadoHabitante.ACTIVO })
  estado!: EstadoHabitante;

  @Column({ name: 'motivo_baja', type: 'text', nullable: true })
  motivoBaja!: string | null;

  @Column({ name: 'fecha_baja', type: 'date', nullable: true })
  fechaBaja!: string | null;

  @Column({ type: 'varchar', length: 150 })
  nombres!: string;

  @Column({ type: 'varchar', length: 150 })
  apellidos!: string;

  @Column({ name: 'tipo_documento_id', type: 'integer', nullable: true })
  tipoDocumentoId!: number | null;

  @ManyToOne(() => CatalogoItem, { nullable: true })
  @JoinColumn({ name: 'tipo_documento_id' })
  tipoDocumento?: CatalogoItem | null;

  @Column({ name: 'numero_documento', type: 'varchar', length: 50, nullable: true })
  @CampoSensible({
    categoria: 'documento-identidad',
    rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO],
  })
  numeroDocumento!: string | null;

  /** Identificador interno cuando no hay documento oficial (RF-01-01): reutiliza el `uuid` ya generado, sin generador nuevo. */
  @Column({ name: 'identificador_interno', type: 'varchar', length: 36, nullable: true, unique: true })
  identificadorInterno!: string | null;

  @Column({ name: 'fecha_nacimiento', type: 'date' })
  fechaNacimiento!: string;

  @Column({ type: 'varchar', length: 1 })
  sexo!: SexoHabitante;

  @Column({ name: 'consentimiento_informado', type: 'boolean', default: false })
  consentimientoInformado!: boolean;

  @Column({ name: 'consentimiento_fecha', type: 'timestamptz', nullable: true })
  consentimientoFecha!: Date | null;
}
