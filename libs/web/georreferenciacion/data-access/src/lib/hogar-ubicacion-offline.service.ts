import { Injectable } from '@angular/core';
import {
  AppDatabase,
  HogarUbicacionOffline,
  OfflineRepository,
  OperacionSync,
  SyncQueueService,
} from '@censo/web-shared-data-access';

/** Envoltorio de dominio sobre OfflineRepository<HogarUbicacionOffline> (RF-03-02, captura GPS offline). */
@Injectable({ providedIn: 'root' })
export class HogarUbicacionOfflineService {
  private readonly repositorio: OfflineRepository<HogarUbicacionOffline>;

  constructor(db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<HogarUbicacionOffline>(db.hogarUbicaciones, 'hogar-ubicaciones', syncQueue);
  }

  obtenerPorHogar(hogarUuid: string): Promise<HogarUbicacionOffline | undefined> {
    return this.repositorio.obtener(hogarUuid);
  }

  /** Siempre "crear": el upsert real ocurre en el backend por hogarId (ver HogarUbicacionService). */
  guardar(ubicacion: HogarUbicacionOffline, operacion: OperacionSync = 'crear'): Promise<void> {
    return this.repositorio.guardar(ubicacion, operacion);
  }
}
