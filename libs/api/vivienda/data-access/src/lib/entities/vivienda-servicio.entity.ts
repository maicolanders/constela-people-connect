import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { EstadoServicio } from '@censo/shared-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { Vivienda } from './vivienda.entity';

/**
 * Acceso a un servicio básico de la vivienda (RF-04-02): una fila por
 * `(viviendaId, tipoServicioCatalogoItemId)` en vez de columnas planas
 * repetidas por servicio — permite agregar tipos de servicio nuevos vía
 * catálogo (`tipo_servicio_vivienda`) sin migración.
 */
@Entity('vivienda_servicios')
@Index(['viviendaId', 'tipoServicioCatalogoItemId'], { unique: true })
export class VivendaServicio extends AuditableBaseEntity {
  @Column({ name: 'vivienda_id', type: 'integer' })
  viviendaId!: number;

  @ManyToOne(() => Vivienda)
  @JoinColumn({ name: 'vivienda_id' })
  vivienda?: Vivienda;

  @Column({ name: 'tipo_servicio_catalogo_item_id', type: 'integer' })
  tipoServicioCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'tipo_servicio_catalogo_item_id' })
  tipoServicio?: CatalogoItem;

  @Column({ type: 'varchar', length: 10 })
  estado!: EstadoServicio;

  /** Catálogo de fuente/tipo según `tipoServicio` (fuente_agua, tipo_saneamiento, fuente_energia, manejo_residuos, tipo_conectividad). */
  @Column({ name: 'fuente_catalogo_item_id', type: 'integer', nullable: true })
  fuenteCatalogoItemId!: number | null;

  @ManyToOne(() => CatalogoItem, { nullable: true })
  @JoinColumn({ name: 'fuente_catalogo_item_id' })
  fuente?: CatalogoItem | null;
}
