import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { CatalogoTipo } from './catalogo-tipo.entity';

/**
 * Ítem de un catálogo administrable. `padreId` autoreferenciado permite
 * jerarquías (p.ej. país -> departamento -> municipio -> resguardo -> vereda).
 */
@Entity('catalogo_items')
@Index(['catalogoTipoId', 'codigo'], { unique: true })
export class CatalogoItem extends AuditableBaseEntity {
  @Column({ name: 'catalogo_tipo_id', type: 'integer' })
  catalogoTipoId!: number;

  @ManyToOne(() => CatalogoTipo)
  @JoinColumn({ name: 'catalogo_tipo_id' })
  catalogoTipo?: CatalogoTipo;

  @Column({ type: 'varchar', length: 60 })
  codigo!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ name: 'padre_id', type: 'integer', nullable: true })
  padreId!: number | null;

  @ManyToOne(() => CatalogoItem, { nullable: true })
  @JoinColumn({ name: 'padre_id' })
  padre?: CatalogoItem | null;

  @Column({ type: 'integer', default: 0 })
  orden!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
