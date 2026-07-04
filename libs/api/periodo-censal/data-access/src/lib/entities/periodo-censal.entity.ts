import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { EstadoPeriodo } from '@censo/shared-data-access';

@Entity('periodos_censales')
export class PeriodoCensal extends AuditableBaseEntity {
  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo!: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio!: string;

  @Column({ name: 'fecha_cierre', type: 'date', nullable: true })
  fechaCierre!: string | null;

  @Column({ type: 'varchar', length: 20, default: EstadoPeriodo.PLANEADO })
  estado!: EstadoPeriodo;

  @Column({ name: 'periodo_origen_id', type: 'integer', nullable: true })
  periodoOrigenId!: number | null;

  @ManyToOne(() => PeriodoCensal, { nullable: true })
  @JoinColumn({ name: 'periodo_origen_id' })
  periodoOrigen?: PeriodoCensal | null;
}
