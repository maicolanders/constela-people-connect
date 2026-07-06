import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export type OperacionSync = 'crear' | 'actualizar' | 'eliminar';
export type EstadoColaSync = 'pendiente' | 'sincronizado' | 'conflicto' | 'error';

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
      habitantes: 'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
    });
    this.version(3).stores({
      colaSincronizacion: '++id, dominio, uuid, estado, [dominio+uuid]',
      catalogoCache: 'clave, tipoCodigo',
      hogares: 'uuid, comunidadId, estado, origen',
      habitantes: 'uuid, comunidadId, hogarUuid, estado, origen, [comunidadId+estado]',
      hogarUbicaciones: 'uuid, hogarUuid, comunidadId',
      ubicacionesGeograficasCache: 'id, padreId',
    });
  }
}
