import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AccionAuditoria = 'crear' | 'actualizar' | 'eliminar';

/**
 * Historial campo a campo de cambios sobre entidades auditables (RNF-04).
 * Poblada por AuditSubscriber (libs/api/shared/feature), nunca a mano.
 */
@Entity('auditorias')
@Index(['tabla', 'registroId'])
export class Auditoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  tabla!: string;

  @Column({ name: 'registro_id', type: 'integer' })
  registroId!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  campo!: string | null;

  @Column({ name: 'valor_anterior', type: 'text', nullable: true })
  valorAnterior!: string | null;

  @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
  valorNuevo!: string | null;

  @Column({ type: 'varchar', length: 20 })
  accion!: AccionAuditoria;

  @Column({ name: 'usuario_id', type: 'integer', nullable: true })
  usuarioId!: number | null;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora!: Date;
}
