import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from './rol.entity';
import { Usuario } from './usuario.entity';

/**
 * Asignación de rol a un usuario, opcionalmente restringida a una comunidad
 * (RT-01: un censista solo ve/edita su comunidad asignada). `comunidadId` se
 * guarda como columna simple (sin relación TypeORM a la entidad Comunidad)
 * para no crear una dependencia de domain:auth hacia domain:comunidad.
 */
@Entity('usuario_roles')
@Index(['usuarioId', 'rolId', 'comunidadId'], { unique: true })
export class UsuarioRol {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'usuario_id', type: 'integer' })
  usuarioId!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ name: 'rol_id', type: 'integer' })
  rolId!: number;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rol_id' })
  rol?: Rol;

  @Column({ name: 'comunidad_id', type: 'integer', nullable: true })
  comunidadId!: number | null;
}
