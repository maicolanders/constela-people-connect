import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import {
  AuditableBaseEntity,
  CampoSensible,
} from '@censo/api-shared-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { RolCodigo } from '@censo/shared-data-access';

/**
 * Identificación étnica de un habitante (RF-08-01). 1:1 con el habitante,
 * relación real (`@ManyToOne`) — mismo patrón que `HabitanteEducacion`
 * (Fase 5): `domain:etnia-vulnerabilidad` ya puede depender de
 * `domain:poblacion`.
 *
 * `resguardoUbicacionGeograficaId` es una columna simple SIN relación
 * TypeORM: a diferencia de `domain:migracion` (Fase 7), `eslint.config.mjs`
 * NO permite que `domain:etnia-vulnerabilidad` dependa de
 * `domain:georreferenciacion`. La integridad referencial real se aplica solo
 * a nivel de base de datos (FK en la migración), sin importar la entidad
 * `UbicacionGeografica` aquí — mismo criterio que `HogarUbicacion.hogarId`
 * en Fase 3, con los roles de dependencia invertidos.
 */
@Entity('habitante_etnias')
export class HabitanteEtnia extends AuditableBaseEntity {
  @Column({ name: 'habitante_id', type: 'integer', unique: true })
  habitanteId!: number;

  @ManyToOne(() => Habitante)
  @JoinColumn({ name: 'habitante_id' })
  habitante?: Habitante;

  /** Catálogo `etnia`. */
  @Column({ name: 'etnia_catalogo_item_id', type: 'integer' })
  @CampoSensible({
    categoria: 'etnia',
    rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO],
  })
  etniaCatalogoItemId!: number;

  @ManyToOne(() => CatalogoItem)
  @JoinColumn({ name: 'etnia_catalogo_item_id' })
  etnia?: CatalogoItem;

  /** Catálogo `lengua` (mismo catálogo que Fase 5): lengua indígena materna, si aplica. */
  @Column({
    name: 'lengua_materna_catalogo_item_id',
    type: 'integer',
    nullable: true,
  })
  @CampoSensible({
    categoria: 'etnia',
    rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO],
  })
  lenguaMaternaCatalogoItemId!: number | null;

  @ManyToOne(() => CatalogoItem, { nullable: true })
  @JoinColumn({ name: 'lengua_materna_catalogo_item_id' })
  lenguaMaterna?: CatalogoItem | null;

  /** Resguardo o territorio asociado (opcional, RF-08-01) — ver nota de diseño arriba. */
  @Column({
    name: 'resguardo_ubicacion_geografica_id',
    type: 'integer',
    nullable: true,
  })
  @CampoSensible({
    categoria: 'etnia',
    rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO],
  })
  resguardoUbicacionGeograficaId!: number | null;
}
