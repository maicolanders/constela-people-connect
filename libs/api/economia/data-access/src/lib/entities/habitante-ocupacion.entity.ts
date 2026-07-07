import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity, CampoSensible } from '@censo/api-shared-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { RolCodigo } from '@censo/shared-data-access';

/**
 * Condición económica de un habitante (RF-06-01). 1:1 con el habitante,
 * relación real (`@ManyToOne`) — mismo patrón que `HabitanteEducacion`
 * (Fase 5): `domain:economia` ya puede depender de `domain:poblacion`.
 */
@Entity('habitante_ocupaciones')
export class HabitanteOcupacion extends AuditableBaseEntity {
  @Column({ name: 'habitante_id', type: 'integer', unique: true })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  /** Catálogo `condicion_actividad`: ocupado/desempleado/inactivo/estudiante/labores_hogar. */
  @Column({ name: 'condicion_actividad_catalogo_item_id', type: 'integer' })
  condicionActividadCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'condicion_actividad_catalogo_item_id' })
  condicionActividad?: CatalogoItem;

  /** Catálogo `ocupacion` (tipo de ocupación/actividad económica): solo aplica si condición = 'ocupado'. */
  @Column({ name: 'ocupacion_catalogo_item_id', type: 'integer', nullable: true })
  ocupacionCatalogoItemId!: number | null;

  @ManyToOne(() => CatalogoItem, { nullable: true })
  @JoinColumn({ name: 'ocupacion_catalogo_item_id' })
  ocupacion?: CatalogoItem | null;

  /** RF-06-01: opcional y sensible (RNF-02 lista "ingresos" explícitamente). */
  @Column({ name: 'ingreso_mensual', type: 'numeric', precision: 12, scale: 2, nullable: true })
  @CampoSensible({
    categoria: 'ingresos',
    rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO],
  })
  ingresoMensual!: string | null;
}
