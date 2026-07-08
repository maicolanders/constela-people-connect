import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity } from '@censo/api-shared-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { UbicacionGeografica } from '@censo/api-georreferenciacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { DireccionMigratoria, TipoMovimientoMigratorio } from '@censo/shared-data-access';

/**
 * Evento migratorio de un habitante (RF-07-01). A diferencia de
 * `HabitanteEducacion`/`HabitanteOcupacion` (Fases 5/6, 1:1), un habitante
 * puede tener múltiples eventos — no hay `unique` en `habitanteId` ni
 * rechazo de duplicado en el servicio.
 *
 * `domain:migracion` puede depender tanto de `domain:poblacion` como de
 * `domain:georreferenciacion` (ver eslint.config.mjs, único dominio con
 * ambos permisos a la vez), así que tanto la relación con `Habitante` como
 * con `UbicacionGeografica` son reales (`@ManyToOne`).
 */
@Entity('movimientos_migratorios')
export class MovimientoMigratorio extends AuditableBaseEntity {
  @Column({ name: 'habitante_id', type: 'integer' })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  /** Periodo en el que se registró el evento (no el de alta del habitante) — RF-07-02 reporta "por comunidad y periodo". */
  @Column({ name: 'periodo_censal_id', type: 'integer' })
  periodoCensalId!: number;

  @Column({ name: 'tipo_movimiento', type: 'varchar', length: 10 })
  tipoMovimiento!: TipoMovimientoMigratorio;

  @Column({ type: 'varchar', length: 10 })
  direccion!: DireccionMigratoria;

  /** `UbicacionGeografica` solo tiene sembrado el árbol de Colombia: el texto libre cubre destinos/orígenes fuera de ese árbol (migración externa). */
  @Column({ name: 'origen_ubicacion_geografica_id', type: 'integer', nullable: true })
  origenUbicacionGeograficaId!: number | null;

  @ManyToOne(() => UbicacionGeografica, { nullable: true })
  @JoinColumn({ name: 'origen_ubicacion_geografica_id' })
  origenUbicacionGeografica?: UbicacionGeografica | null;

  @Column({ name: 'origen_descripcion_libre', type: 'varchar', length: 150, nullable: true })
  origenDescripcionLibre!: string | null;

  @Column({ name: 'destino_ubicacion_geografica_id', type: 'integer', nullable: true })
  destinoUbicacionGeograficaId!: number | null;

  @ManyToOne(() => UbicacionGeografica, { nullable: true })
  @JoinColumn({ name: 'destino_ubicacion_geografica_id' })
  destinoUbicacionGeografica?: UbicacionGeografica | null;

  @Column({ name: 'destino_descripcion_libre', type: 'varchar', length: 150, nullable: true })
  destinoDescripcionLibre!: string | null;

  @Column({ name: 'fecha_movimiento', type: 'date' })
  fechaMovimiento!: string;

  @Column({ name: 'motivo_catalogo_item_id', type: 'integer' })
  motivoCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'motivo_catalogo_item_id' })
  motivo?: CatalogoItem;

  /** RF-07-01: distingue migración temporal de definitiva. */
  @Column({ name: 'es_temporal', type: 'boolean' })
  esTemporal!: boolean;
}
