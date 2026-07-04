import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RolCodigo } from '@censo/shared-data-access';

/** Catálogo fijo de roles (RT-01), sembrado por seeder, sin auditoría propia. */
@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo!: RolCodigo;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;
}
