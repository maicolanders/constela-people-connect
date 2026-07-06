import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';

/**
 * Nodo del árbol real de lugares (país -> departamento -> municipio ->
 * resguardo/territorio -> vereda/comunidad, RF-03-01). No reutiliza
 * `catalogo_items` genérico (saturaría el catálogo administrable con miles de
 * municipios/veredas): `nivelGeograficoCatalogoItemId` solo clasifica el
 * *nivel* de este nodo (catálogo plano `nivel_geografico`), la jerarquía real
 * de lugares vive en `padreId` (self-reference), igual patrón que
 * `CatalogoItem.padreId`.
 */
@Entity('ubicaciones_geograficas')
export class UbicacionGeografica extends AuditableBaseEntity {
  @Column({ name: 'nivel_geografico_catalogo_item_id', type: 'integer' })
  nivelGeograficoCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'nivel_geografico_catalogo_item_id' })
  nivelGeografico?: CatalogoItem;

  @Column({ name: 'padre_id', type: 'integer', nullable: true })
  @Index()
  padreId!: number | null;

  @ManyToOne(() => UbicacionGeografica, { nullable: true })
  @JoinColumn({ name: 'padre_id' })
  padre?: UbicacionGeografica | null;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  /** Código oficial opcional (p.ej. DIVIPOLA). */
  @Column({ type: 'varchar', length: 30, nullable: true })
  codigo!: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
