import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';

/** Lengua(s) habladas por un habitante (RF-05-01: puede registrar más de una, incluida la lengua materna indígena). */
@Entity('habitante_lenguas')
@Index(['habitanteId', 'lenguaCatalogoItemId'], { unique: true })
export class HabitanteLengua extends AuditableBaseEntity {
  @Column({ name: 'habitante_id', type: 'integer' })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  @Column({ name: 'lengua_catalogo_item_id', type: 'integer' })
  lenguaCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'lengua_catalogo_item_id' })
  lengua?: CatalogoItem;

  @Column({ name: 'es_lengua_materna', type: 'boolean', default: false })
  esLenguaMaterna!: boolean;
}
