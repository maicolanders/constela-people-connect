import { Column, Entity } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';

@Entity('usuarios')
export class Usuario extends AuditableBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 100 })
  apellido!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
