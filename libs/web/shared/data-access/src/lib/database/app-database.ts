import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export type OperacionSync = 'crear' | 'actualizar' | 'eliminar';
export type EstadoColaSync =
  | 'pendiente'
  | 'sincronizado'
  | 'conflicto'
  | 'error';

export interface ColaSincronizacionEntrada {
  id?: number;
  dominio: string;
  uuid: string;
  operacion: OperacionSync;
  payload: Record<string, unknown>;
  /** ISO timestamp de la última vez que este registro se leyó del servidor (para el auto-merge). */
  actualizadoEnCliente: string;
  estado: EstadoColaSync;
  intentos: number;
  mensaje?: string;
  /** Versión del servidor cuando hay conflicto, para la pantalla de resolución manual. */
  entidadServidor?: Record<string, unknown>;
  creadoEn: string;
}

export interface CatalogoItemCache {
  /** Clave compuesta `${tipoCodigo}:${codigo}`. */
  clave: string;
  tipoCodigo: string;
  id: number;
  codigo: string;
  nombre: string;
  padreId: number | null;
  orden: number;
}

/** 'local' = creado en este dispositivo (puede estar pendiente de sync); 'servidor' = traído por el pull de solo lectura (HabitantesPullService). */
export type OrigenRegistroOffline = 'local' | 'servidor';

export interface HogarOffline {
  uuid: string;
  comunidadId: number;
  periodoCensalId: number;
  estado: string;
  motivoBaja?: string | null;
  direccionReferencia?: string | null;
  consentimientoInformado?: boolean;
  consentimientoFecha?: string | null;
  jefeHogarId?: number | null;
  origen: OrigenRegistroOffline;
}

export interface UbicacionGeograficaCache {
  id: number;
  nivelGeograficoCatalogoItemId: number;
  padreId: number | null;
  nombre: string;
  codigo: string | null;
}

/**
 * Captura GPS de un hogar (RF-03-02): 1:1 con el hogar, por eso reutiliza el
 * mismo `uuid` del hogar como clave (no existe una identidad propia de
 * "ubicación" distinta del hogar al que pertenece).
 */
export interface HogarUbicacionOffline {
  uuid: string;
  hogarUuid: string;
  comunidadId: number;
  ubicacionGeograficaId: number;
  latitud: number;
  longitud: number;
  precisionMetros?: number | null;
  capturadoEn: string;
  clasificacion: string;
  tipoTerritorioCatalogoItemId?: number | null;
  origen: OrigenRegistroOffline;
}

export interface ServicioViviendaOffline {
  tipoServicioCatalogoItemId: number;
  estado: string;
  fuenteCatalogoItemId?: number | null;
}

/** 1:1 con el hogar (mismo criterio que HogarUbicacionOffline): reutiliza el uuid del hogar como clave. */
export interface ViviendaOffline {
  uuid: string;
  hogarUuid: string;
  comunidadId: number;
  tipoViviendaCatalogoItemId: number;
  materialParedCatalogoItemId: number;
  materialPisoCatalogoItemId: number;
  materialTechoCatalogoItemId: number;
  numeroHabitaciones?: number | null;
  numeroDormitorios: number;
  servicios: ServicioViviendaOffline[];
  origen: OrigenRegistroOffline;
}

export interface HabitanteOffline {
  uuid: string;
  /** Referencia por uuid al hogar (Fase 0.6): el hogarId numérico puede no existir todavía si se creó en la misma sesión offline. */
  hogarUuid: string;
  comunidadId: number;
  periodoCensalId: number;
  estado: string;
  nombres: string;
  apellidos: string;
  tipoDocumentoId?: number | null;
  numeroDocumento?: string | null;
  fechaNacimiento: string;
  sexo: string;
  /** Requerido al crear (RF-01-03); ausente en los registros traídos por el pull de solo lectura (no se usa para detectar duplicados). */
  parentescoCatalogoItemId?: number;
  consentimientoInformado?: boolean;
  consentimientoFecha?: string | null;
  origen: OrigenRegistroOffline;
}

export interface LenguaHabitanteOffline {
  lenguaCatalogoItemId: number;
  esLenguaMaterna?: boolean;
}

/** 1:1 con el habitante (mismo criterio que ViviendaOffline): reutiliza el uuid del habitante como clave. */
export interface HabitanteEducacionOffline {
  uuid: string;
  habitanteUuid: string;
  alfabetizado: boolean;
  nivelEducativoCatalogoItemId: number;
  asisteEscuela: boolean;
  lenguas: LenguaHabitanteOffline[];
  origen: OrigenRegistroOffline;
}

/** 1:1 con el habitante (mismo criterio que HabitanteEducacionOffline): reutiliza el uuid del habitante como clave. */
export interface HabitanteOcupacionOffline {
  uuid: string;
  habitanteUuid: string;
  condicionActividadCatalogoItemId: number;
  ocupacionCatalogoItemId?: number | null;
  ingresoMensual?: number | null;
  origen: OrigenRegistroOffline;
}

/**
 * Evento migratorio de un habitante (RF-07-01). A diferencia de
 * `HabitanteEducacionOffline`/`HabitanteOcupacionOffline` (1:1, reutilizan el
 * uuid del habitante), un habitante puede tener múltiples eventos: cada uno
 * tiene su propio `uuid` y se filtra por `habitanteUuid` al listar.
 */
export interface MovimientoMigratorioOffline {
  uuid: string;
  habitanteUuid: string;
  periodoCensalId: number;
  tipoMovimiento: string;
  direccion: string;
  origenUbicacionGeograficaId?: number | null;
  origenDescripcionLibre?: string | null;
  destinoUbicacionGeograficaId?: number | null;
  destinoDescripcionLibre?: string | null;
  fechaMovimiento: string;
  motivoCatalogoItemId: number;
  esTemporal: boolean;
  origen: OrigenRegistroOffline;
}

export interface CondicionVulnerabilidadHabitanteOffline {
  condicionVulnerabilidadCatalogoItemId: number;
}

/** 1:1 con el habitante (mismo criterio que HabitanteEducacionOffline): reutiliza el uuid del habitante como clave. */
export interface HabitanteEtniaOffline {
  uuid: string;
  habitanteUuid: string;
  etniaCatalogoItemId: number;
  lenguaMaternaCatalogoItemId?: number | null;
  resguardoUbicacionGeograficaId?: number | null;
  condicionesVulnerabilidad: CondicionVulnerabilidadHabitanteOffline[];
  origen: OrigenRegistroOffline;
}

/**
 * Base de datos IndexedDB (offline-first, RNF-01). Los dominios de captura de
 * las Fases 1+ (habitantes, hogares, viviendas, ...) añadirán sus propias
 * tablas incrementando `this.version(N)` con el esquema completo acumulado
 * (así es como Dexie versiona: cada `version()` declara TODAS las tablas
 * vigentes en ese punto, no solo las nuevas).
 *
 * Nunca se accede a esta clase directamente desde componentes: siempre a
 * través de OfflineRepository / SyncQueueService / servicios de dominio.
 */
@Injectable({ providedIn: 'root' })
export class AppDatabase extends Dexie {
  colaSincronizacion!: Table<ColaSincronizacionEntrada, number>;
  catalogoCache!: Table<CatalogoItemCache, string>;
  hogares!: Table<HogarOffline, string>;
  habitantes!: Table<HabitanteOffline, string>;
  hogarUbicaciones!: Table<HogarUbicacionOffline, string>;
  ubicacionesGeograficasCache!: Table<UbicacionGeograficaCache, number>;
  viviendas!: Table<ViviendaOffline, string>;
  habitanteEducaciones!: Table<HabitanteEducacionOffline, string>;
  habitanteOcupaciones!: Table<HabitanteOcupacionOffline, string>;
  movimientosMigratorios!: Table<MovimientoMigratorioOffline, string>;
  habitanteEtnias!: Table<HabitanteEtniaOffline, string>;

  constructor() {
    super('censo-indigena-db');
    this.version(1).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
    });
    this.version(2).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes:
        'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
    });
    this.version(3).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes:
        'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
      hogarUbicaciones: 'uuid, hogarUuid, comunidadId',
      ubicacionesGeograficasCache: 'id, padreId',
    });
    this.version(4).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes:
        'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
      hogarUbicaciones: 'uuid, hogarUuid, comunidadId',
      ubicacionesGeograficasCache: 'id, padreId',
      viviendas: 'uuid, hogarUuid, comunidadId',
    });
    this.version(5).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes:
        'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
      hogarUbicaciones: 'uuid, hogarUuid, comunidadId',
      ubicacionesGeograficasCache: 'id, padreId',
      viviendas: 'uuid, hogarUuid, comunidadId',
      habitanteEducaciones: 'uuid, habitanteUuid',
    });
    this.version(6).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes:
        'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
      hogarUbicaciones: 'uuid, hogarUuid, comunidadId',
      ubicacionesGeograficasCache: 'id, padreId',
      viviendas: 'uuid, hogarUuid, comunidadId',
      habitanteEducaciones: 'uuid, habitanteUuid',
      habitanteOcupaciones: 'uuid, habitanteUuid',
    });
    this.version(7).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes:
        'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
      hogarUbicaciones: 'uuid, hogarUuid, comunidadId',
      ubicacionesGeograficasCache: 'id, padreId',
      viviendas: 'uuid, hogarUuid, comunidadId',
      habitanteEducaciones: 'uuid, habitanteUuid',
      habitanteOcupaciones: 'uuid, habitanteUuid',
      movimientosMigratorios: 'uuid, habitanteUuid',
    });
    this.version(8).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes:
        'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
      hogarUbicaciones: 'uuid, hogarUuid, comunidadId',
      ubicacionesGeograficasCache: 'id, padreId',
      viviendas: 'uuid, hogarUuid, comunidadId',
      habitanteEducaciones: 'uuid, habitanteUuid',
      habitanteOcupaciones: 'uuid, habitanteUuid',
      movimientosMigratorios: 'uuid, habitanteUuid',
      habitanteEtnias: 'uuid, habitanteUuid',
    });
  }
}
