import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import {
  AuditableBaseEntity,
  CampoSensible,
} from '@censo/api-shared-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { RolCodigo } from '@censo/shared-data-access';

/**
 * Condición de vulnerabilidad de un habitante (RF-08-02). N por habitante
 * (puede tener varias simultáneas), con restricción única por par
 * habitante+condición — a diferencia de `MovimientoMigratorio` (Fase 7, N
 * eventos históricos que sí pueden repetirse), aquí una misma condición
 * registrada dos veces para el mismo habitante no aporta información nueva;
 * el conjunto se administra por reemplazo completo, mismo patrón que
 * `HabitanteLengua` (Fase 5).
 */
@Entity('habitante_condiciones_vulnerabilidad')
@Index(['habitanteId', 'condicionVulnerabilidadCatalogoItemId'], {
  unique: true,
})
export class HabitanteCondicionVulnerabilidad extends AuditableBaseEntity {
  @Column({ name: 'habitante_id', type: 'integer' })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  /** Catálogo `condicion_vulnerabilidad` (discapacidad física/visual/auditiva/cognitiva, víctima de conflicto armado, etc.). */
  @Column({
    name: 'condicion_vulnerabilidad_catalogo_item_id',
    type: 'integer',
  })
  @CampoSensible({
    categoria: 'salud',
    rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO],
  })
  condicionVulnerabilidadCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'condicion_vulnerabilidad_catalogo_item_id' })
  condicionVulnerabilidad?: CatalogoItem;
}
