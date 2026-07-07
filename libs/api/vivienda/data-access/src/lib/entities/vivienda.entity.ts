import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';

/**
 * Caracterización física de la vivienda de un hogar (RF-04-01). 1:1 con el
 * hogar (`hogares.vivienda_id`, ver `HogarService.asignarVivienda`), no
 * versionada por periodo censal: es un atributo físico, se edita mientras el
 * periodo del hogar esté abierto, igual que `HogarUbicacion` en Fase 3.
 */
@Entity('viviendas')
export class Vivienda extends AuditableBaseEntity {
  /** Denormalizado desde hogar.comunidadId (fijado por el llamador, nunca por el cliente): scope por comunidad sin depender de domain:poblacion. */
  @Column({ name: 'comunidad_id', type: 'integer' })
  comunidadId!: number;

  @Column({ name: 'tipo_vivienda_catalogo_item_id', type: 'integer' })
  tipoViviendaCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'tipo_vivienda_catalogo_item_id' })
  tipoVivienda?: CatalogoItem;

  @Column({ name: 'material_pared_catalogo_item_id', type: 'integer' })
  materialParedCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'material_pared_catalogo_item_id' })
  materialPared?: CatalogoItem;

  @Column({ name: 'material_piso_catalogo_item_id', type: 'integer' })
  materialPisoCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'material_piso_catalogo_item_id' })
  materialPiso?: CatalogoItem;

  @Column({ name: 'material_techo_catalogo_item_id', type: 'integer' })
  materialTechoCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'material_techo_catalogo_item_id' })
  materialTecho?: CatalogoItem;

  @Column({ name: 'numero_habitaciones', type: 'integer', nullable: true })
  numeroHabitaciones!: number | null;

  /** RF-04-01: base del cálculo de hacinamiento (habitantes/dormitorio). */
  @Column({ name: 'numero_dormitorios', type: 'integer' })
  numeroDormitorios!: number;
}
