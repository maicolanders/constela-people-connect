import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Habitante } from './habitante.entity';

/**
 * Refresh tokens rotativos de la sesión de autogestión del propio habitante
 * (Fase 14) — mismo patrón que `RefreshToken` (Usuario/staff, Fase 0), en
 * tabla separada porque un habitante no es un `Usuario`.
 */
@Entity('habitante_refresh_tokens')
@Index(['habitanteId'])
export class HabitanteRefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'habitante_id', type: 'integer' })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
