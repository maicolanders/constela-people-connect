import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { Comunidad } from '@censo/api-comunidad-data-access';
import { PeriodoCensal } from '@censo/api-periodo-censal-data-access';

/**
 * Presupuesto asignado a una comunidad en un periodo censal (RF-09-02).
 * `domain:recursos` SÍ puede depender de `domain:comunidad` y
 * `domain:periodo-censal` (ver eslint.config.mjs) — a diferencia de
 * `HabitanteEtnia.resguardoUbicacionGeograficaId` (Fase 8), aquí ambas
 * relaciones son reales (`@ManyToOne`), sin ningún workaround.
 *
 * Un registro por comunidad+periodo (restricción única): una corrección de
 * monto se hace vía `PATCH`, no agregando una segunda fila para el mismo par.
 */
@Entity('presupuestos')
@Index(['comunidadId', 'periodoCensalId'], { unique: true })
export class Presupuesto extends AuditableBaseEntity {
  @Column({ name: 'comunidad_id', type: 'integer' })
  comunidadId!: number;

  @ManyToOne(() => Comunidad)
  @JoinColumn({ name: 'comunidad_id' })
  comunidad?: Comunidad;

  @Column({ name: 'periodo_censal_id', type: 'integer' })
  periodoCensalId!: number;

  @ManyToOne(() => PeriodoCensal)
  @JoinColumn({ name: 'periodo_censal_id' })
  periodoCensal?: PeriodoCensal;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  monto!: string;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;
}
