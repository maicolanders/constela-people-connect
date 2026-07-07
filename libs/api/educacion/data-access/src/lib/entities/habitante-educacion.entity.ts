import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';

/**
 * Caracterización educativa de un habitante (RF-05-01). 1:1 con el
 * habitante — a diferencia de `HogarUbicacion`/`Vivienda` (Fase 3/4),
 * `domain:educacion` SÍ puede depender de `domain:poblacion` (ver
 * eslint.config.mjs), así que la relación con `Habitante` es real
 * (`@ManyToOne`), sin necesidad de una columna simple ni de un puntero hacia
 * adelante en `Habitante`.
 */
@Entity('habitante_educaciones')
export class HabitanteEducacion extends AuditableBaseEntity {
  @Column({ name: 'habitante_id', type: 'integer', unique: true })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  @Column({ type: 'boolean' })
  alfabetizado!: boolean;

  @Column({ name: 'nivel_educativo_catalogo_item_id', type: 'integer' })
  nivelEducativoCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'nivel_educativo_catalogo_item_id' })
  nivelEducativo?: CatalogoItem;

  @Column({ name: 'asiste_escuela', type: 'boolean' })
  asisteEscuela!: boolean;
}
