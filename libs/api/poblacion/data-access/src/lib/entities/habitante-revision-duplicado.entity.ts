import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { DecisionRevisionDuplicado } from '@censo/shared-data-access';
import { Habitante } from './habitante.entity';

/**
 * Trazabilidad de RF-01-05: cuando el censista confirma que un habitante NO
 * es duplicado de otro similar, queda registrado aquí (quién y cuándo vía
 * createdBy/createdAt de AuditableBaseEntity).
 */
@Entity('habitante_revisiones_duplicado')
export class HabitanteRevisionDuplicado extends AuditableBaseEntity {
  @Column({ name: 'habitante_id', type: 'integer' })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  @Column({ name: 'habitante_similar_id', type: 'integer' })
  habitanteSimilarId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_similar_id' })
  habitanteSimilar?: Habitante;

  @Column({ name: 'score_similitud', type: 'numeric', precision: 4, scale: 3 })
  scoreSimilitud!: number;

  @Column({ type: 'varchar', length: 30, default: DecisionRevisionDuplicado.CONFIRMADO_NO_DUPLICADO })
  decision!: DecisionRevisionDuplicado;

  @Column({ type: 'text', nullable: true })
  justificacion!: string | null;
}
