import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { Habitante } from './habitante.entity';
import { Hogar } from './hogar.entity';

/**
 * Característica recensada por periodo (mismo patrón que
 * habitante_educaciones/habitante_ocupaciones de fases futuras): el
 * parentesco con el jefe de hogar puede cambiar entre periodos censales,
 * por eso lleva `periodoCensalId` + `version` en vez de ser una columna fija
 * en `Habitante`.
 */
@Entity('habitante_parentescos')
@Index(['habitanteId', 'periodoCensalId'], { unique: true })
export class HabitanteParentesco extends AuditableBaseEntity {
  @Column({ type: 'varchar', length: 36, unique: true })
  uuid!: string;

  @Column({ name: 'habitante_id', type: 'integer' })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  /** Denormalizado desde habitante.hogarId para poder filtrar sin join. */
  @Column({ name: 'hogar_id', type: 'integer' })
  hogarId!: number;

  @ManyToOne(() => Hogar)
  @JoinColumn({ name: 'hogar_id' })
  hogar?: Hogar;

  @Column({ name: 'catalogo_item_id', type: 'integer' })
  catalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'catalogo_item_id' })
  catalogoItem?: CatalogoItem;

  @Column({ name: 'periodo_censal_id', type: 'integer' })
  periodoCensalId!: number;

  @Column({ type: 'integer', default: 1 })
  version!: number;
}
