import { Column, Entity } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';

@Entity('comunidades')
export class Comunidad extends AuditableBaseEntity {
  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'boolean', default: true })
  activa!: boolean;

  /** RF-02-01: la identidad de género es "configurable/activable según parametrización" por comunidad. */
  @Column({ name: 'captura_identidad_genero', type: 'boolean', default: false })
  capturaIdentidadGenero!: boolean;
}
