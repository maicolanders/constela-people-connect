import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableBaseEntity, CampoSensible } from '@censo/api-shared-data-access';
import { ClasificacionUbicacion, RolCodigo } from '@censo/shared-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { UbicacionGeografica } from './ubicacion-geografica.entity';

/**
 * Captura de la ubicación de un hogar (RF-03-02/03-04). `hogarId`/`comunidadId`
 * son columnas simples SIN relación TypeORM: `domain:georreferenciacion` no
 * puede depender de `domain:poblacion` (ver eslint.config.mjs, la dependencia
 * va al revés: poblacion -> georreferenciacion). `comunidadId` lo fija
 * siempre el llamador (HogarService, que ya verificó acceso) a partir del
 * hogar real, nunca se confía en un valor recibido del cliente.
 */
@Entity('hogar_ubicaciones')
export class HogarUbicacion extends AuditableBaseEntity {
  @Column({ name: 'hogar_id', type: 'integer', unique: true })
  hogarId!: number;

  @Column({ name: 'comunidad_id', type: 'integer' })
  @Index()
  comunidadId!: number;

  @Column({ name: 'ubicacion_geografica_id', type: 'integer' })
  ubicacionGeograficaId!: number;

  @ManyToOne(() => UbicacionGeografica)
  @JoinColumn({ name: 'ubicacion_geografica_id' })
  ubicacionGeografica?: UbicacionGeografica;

  /** RF-03-02: PostGIS point (GeoJSON `{ type: 'Point', coordinates: [lng, lat] }`). */
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  @CampoSensible({
    categoria: 'ubicacion-exacta',
    rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO],
  })
  coordenadas!: { type: 'Point'; coordinates: [number, number] };

  @Column({ name: 'precision_metros', type: 'numeric', precision: 10, scale: 2, nullable: true })
  precisionMetros!: string | null;

  @Column({ name: 'capturado_en', type: 'timestamptz' })
  capturadoEn!: Date;

  @Column({ type: 'varchar', length: 20 })
  clasificacion!: ClasificacionUbicacion;

  @Column({ name: 'tipo_territorio_catalogo_item_id', type: 'integer', nullable: true })
  tipoTerritorioCatalogoItemId!: number | null;

  @ManyToOne(() => CatalogoItem, { nullable: true })
  @JoinColumn({ name: 'tipo_territorio_catalogo_item_id' })
  tipoTerritorio?: CatalogoItem | null;
}
